import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Switch, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, AppState } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Calendar from 'expo-calendar';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { Button } from '@/components/ui/Button';
import { OptionModal } from '@/components/ui/OptionModal';
import { supabase } from '@/lib/supabase';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, userSettings, subscription, tasks, updateUserSettings, getCurrentTheme, isLoading, createCheckoutSession, triggerRefresh } = useAppStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const currentTheme = getCurrentTheme();
  const appState = useRef(AppState.currentState);
  
  // This handles refreshing when navigating between tabs
  useFocusEffect(
    useCallback(() => {
      triggerRefresh();
    }, [triggerRefresh])
  );

  // This specifically handles refreshing when the app returns from the background
  // (e.g., after the Stripe checkout browser is closed).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground, refreshing profile data...');
        triggerRefresh();
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [triggerRefresh]);
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleLanguageToggle = () => {
    if (userSettings) {
      updateUserSettings({
        language: userSettings.language === 'en' ? 'ar' : 'en',
      });
    }
  };
  
  const handleNotificationsToggle = () => {
    if (userSettings) {
      updateUserSettings({
        notifications_enabled: !userSettings.notifications_enabled,
      });
    }
  };
  
  async function syncTasksToCalendar(calendarId: string) {
    console.log('[CalendarSync] Starting sync process...');
    if (!calendarId) { // This check is now mostly for safety
      Alert.alert('Error', 'Could not find or create a calendar. Check logs for details.');
      console.log('[CalendarSync] Failed to get or create calendar. Aborting.');
      return;
    }

    // Fetch existing events in this calendar to avoid duplicates
    console.log(`[CalendarSync] Using calendar ID: ${calendarId}. Fetching existing events...`);
    const events = await Calendar.getEventsAsync([calendarId], new Date(2020, 0, 1), new Date(2030, 11, 31));
    const taskIdsInCalendar = new Set(events.map(event => event.notes));

    let syncedCount = 0;
    for (const task of tasks) {
      if (task.due_at && !taskIdsInCalendar.has(task.id)) {
        try {
          const eventDetails = {
            title: task.title,
            startDate: new Date(task.due_at),
            endDate: new Date(new Date(task.due_at).getTime() + 60 * 60 * 1000), // 1 hour duration
            notes: task.id, // Store task ID to prevent duplicates
          };
          console.log(`[CalendarSync] Creating event for task: "${task.title}"`);
          console.log('[CalendarSync] Event details payload:', JSON.stringify(eventDetails, null, 2));
          await Calendar.createEventAsync(calendarId, eventDetails);
          syncedCount++;
        } catch (error) {
          console.error(`[CalendarSync] Failed to create event for task ID ${task.id}:`, error);
        }
      } else {
        console.log(`[CalendarSync] Skipping task: "${task.title}" (No due date or already synced).`);
      }
    }
    Alert.alert('Sync Complete', `${syncedCount} new task(s) were synced to your calendar.`);
  }

  async function getOrCreateCalendar() {
    // Request both read and write permissions for the calendar
    console.log('[CalendarSync] Requesting calendar permissions...');
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your calendar to sync tasks.');
      console.error('[CalendarSync] Calendar permission denied.');
      return null;
    }

    console.log('[CalendarSync] Fetching available calendars...');
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    console.log(`[CalendarSync] Found ${calendars.length} calendars:`, calendars.map(c => ({ title: c.title, source: c.source, allowsModifications: c.allowsModifications })));

    // Find an existing calendar but ignore local ones that might have been created incorrectly before.
    const appCalendar = calendars.find(cal => cal.title === 'Dot Tasks' && cal.source.type !== 'LOCAL');

    if (appCalendar) {
      console.log(`[CalendarSync] Found existing "Dot Tasks" calendar with ID: ${appCalendar.id}`);
      return appCalendar.id;
    }

    // Find a valid source to create the new calendar in
    console.log('[CalendarSync] "Dot Tasks" calendar not found. Attempting to create a new one.');
    let defaultSource: Calendar.Source | undefined;
    let sourceId: string | undefined;

    if (Platform.OS === 'ios') {
      // On iOS, find a source that is not 'local' to ensure it's a synced calendar (like iCloud)
      console.log('[CalendarSync] iOS: Searching for iCloud source...');
      const icloudSource = calendars.find(cal => cal.source.type === Calendar.SourceType.CALDAV && cal.source.name === 'iCloud');
      if (icloudSource) {
        defaultSource = icloudSource.source;
        sourceId = icloudSource.source.id;
        console.log('[CalendarSync] iOS: Found iCloud source.', defaultSource);
      } else {
        // Fallback to the first writable non-local calendar
        console.log('[CalendarSync] iOS: iCloud source not found. Falling back to first writable non-local source...');
        const firstWritable = calendars.find(cal => cal.allowsModifications && cal.source.type !== Calendar.SourceType.LOCAL);
        if (firstWritable) {
          defaultSource = firstWritable.source;
          sourceId = firstWritable.source.id;
          console.log('[CalendarSync] iOS: Found fallback source.', defaultSource);
        }
      }
    } else {
      // On Android, find any writable source. Prefer Google if available.
      console.log('[CalendarSync] Android: Searching for a writable Google source...');
      // Prefer a non-primary Google calendar (like 'Holidays') as a source, as it's more reliable for creation.
      let googleSourceCalendar = calendars.find(cal => 
        cal.allowsModifications && 
        cal.source.type === 'com.google' && 
        cal.title !== cal.source.name // Exclude the primary calendar
      );

      // If no non-primary calendar is found, fall back to the first available Google calendar.
      if (!googleSourceCalendar) {
        googleSourceCalendar = calendars.find(cal => cal.allowsModifications && cal.source.type === 'com.google');
      }

      if (googleSourceCalendar) {
        // On Android, you need to provide the source object.
        defaultSource = googleSourceCalendar.source;
        sourceId = googleSourceCalendar.id; // And an existing calendar ID from that source.
        console.log(`[CalendarSync] Android: Found Google source:`, defaultSource);
      } else {
        // Fallback for non-Google devices
        console.log('[CalendarSync] Android: Google calendar not found. Falling back to first writable calendar...');
        const firstWritable = calendars.find(cal => cal.allowsModifications);
        if (firstWritable) {
          sourceId = firstWritable.id;
          defaultSource = firstWritable.source;
          console.log(`[CalendarSync] Android: Found fallback writable calendar to use as source. Source (calendar) ID: ${sourceId}`);
        }
      }
    }

    if (!sourceId) {
      console.error('[CalendarSync] Could not find a suitable calendar source to create a new calendar.');
      return null;
    }

    try {
      console.log(`[CalendarSync] Creating new calendar with source ID: ${sourceId}`);
      const calendarDetails = {
        title: 'Dot Tasks',
        color: colors.primary,
        name: 'Dot Tasks', // This is required by the native API
        entityType: Calendar.EntityTypes.EVENT,
        source: defaultSource,
        sourceId: sourceId,
        isVisible: true,
        ownerAccount: (defaultSource as any)?.ownerAccount || defaultSource?.name,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      };
      console.log('[CalendarSync] Calendar details payload:', JSON.stringify(calendarDetails, null, 2));
      const newCalendarID = await Calendar.createCalendarAsync(calendarDetails);
      console.log(`[CalendarSync] Successfully created new calendar with ID: ${newCalendarID}`);
      return newCalendarID;
    } catch (error) {
      console.error('[CalendarSync] Error creating new calendar:', error);
      // Fallback: If creating a new calendar fails, try to use the primary calendar.
      console.log('[CalendarSync] Fallback: Trying to use the primary calendar.');
      const primaryCalendar = calendars.find(cal => 
          cal.allowsModifications && 
          cal.source.type === 'com.google' && 
          cal.title === cal.source.name
      );
      if (primaryCalendar) {
          console.log(`[CalendarSync] Fallback: Found primary Google calendar with ID: ${primaryCalendar.id}`);
          Alert.alert('Sync Notice', 'Could not create a "Dot Tasks" calendar. Syncing to your primary calendar instead.');
          return primaryCalendar.id;
      }
      return null; // Return null if even the fallback fails.
    }
  }

  const handleCalendarSync = async () => {
    if (subscription?.plan !== 'free') {
      // Always prompt user to select a calendar
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your calendar to sync tasks.');
        return;
      }
      setCalendarOptions(await getCalendarOptions());
      setShowCalendarModal(true);

    } else {
      const platformName = Platform.OS === 'ios' ? 'Apple' : 'Google';
      promptUpgrade(`Sync with ${platformName} Calendar by upgrading to Premium.`);
    }
  };

  const handleSelectCalendar = async (calendarId: string) => {
    setShowCalendarModal(false);
    if (calendarId === 'create_new') {
      const newCalendarId = await getOrCreateCalendar();
      if (newCalendarId) {
        await syncTasksToCalendar(newCalendarId);
      }
    } else {
      await syncTasksToCalendar(calendarId);
    }
  };

  
  const handleThemeToggle = () => {
    if (userSettings) {
      updateUserSettings({
        theme: userSettings.theme === 'dark' ? 'light' : 'dark',
      });
    }
  };
  
  const promptUpgrade = (message: string) => {
    Alert.alert(
      'Premium Feature',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade Now', onPress: handleUpgrade }, // This was missing the onPress handler
      ]
    );
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };
  
  const handleSubscriptionChange = (plan: 'monthly' | 'yearly') => {
    setShowUpgradeModal(false);
    createCheckoutSession(plan).catch(error => {
      Alert.alert(
        'Error',
        'Could not start the subscription process. Please try again later.'
      );
    });
  };
  
  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Plan',
          onPress: handleUpgrade,
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Cancel Subscription',
              'Are you sure you want to cancel your subscription?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: () => {
                    console.log('Subscription cancelled');
                    Alert.alert('Cancelled', 'Your subscription has been cancelled.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };
  
  const handleLogout = () => {
    // Sign out using supabase and redirect to root
    supabase.auth.signOut();
  };
  
  const subscriptionOptions = [
    { value: 'monthly', label: 'Monthly ($4.99/month)' },
    { value: 'yearly', label: 'Yearly ($39.99/year)' },
  ];

  const getCalendarOptions = async () => {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writableCalendars = calendars.filter(c => c.allowsModifications);
    const options = writableCalendars.map(c => ({
      label: `${c.title} (${c.source.name})`,
      value: c.id,
    }));
    // Add an option to create a new calendar
    options.unshift({ label: 'Create a new "Dot Tasks" calendar', value: 'create_new' });
    return options;
  };

  const [calendarOptions, setCalendarOptions] = useState<any[]>([]);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      contentContainerStyle={{ ...styles.contentContainer, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* User info */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image 
              source={{ uri: user.avatar_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.full_name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.userName, { color: currentTheme.text }]}>{user?.full_name}</Text>
        <Text style={[styles.userEmail, { color: currentTheme.textMuted }]}>{user?.email}</Text>
        
        {subscription?.plan === 'free' && (
          <Button 
            title="Upgrade to Premium" 
            onPress={handleUpgrade}
            variant="primary"
            size="small"
            style={styles.upgradeButton}
            leftIcon={<MaterialCommunityIcons name="crown" size={16} color={colors.white} />}
          />
        )}
      </View>
      
      {/* Edit Profile */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Profile</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: currentTheme.card }]}
          onPress={handleEditProfile}
          testID="edit-profile-button"
        >
          <View style={styles.settingIconContainer}>
            <Feather name="user" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Edit Profile</Text>
            <Text style={[styles.settingDescription, { color: currentTheme.textMuted }]}>
              Update your name, email, and avatar
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={currentTheme.textMuted} />
        </TouchableOpacity>
      </View>
      
      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Preferences</Text>
        
        <View style={[styles.settingItem, { backgroundColor: currentTheme.card }]}>
          <View style={styles.settingIconContainer}>
            <Feather name="globe" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Language</Text>
            <Text style={[styles.settingValue, { color: currentTheme.textMuted }]}>
              {userSettings?.language === 'en' ? 'English' : 'Arabic'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleLanguageToggle}
            testID="language-toggle"
          >
            <Feather name="chevron-right" size={20} color={currentTheme.textMuted} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.settingItem, { backgroundColor: currentTheme.card }]}>
          <View style={styles.settingIconContainer}>
            {userSettings?.theme === 'dark' ? (
              <Feather name="moon" size={20} color={colors.primary} />
            ) : (
              <Feather name="sun" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Theme</Text>
            <Text style={[styles.settingValue, { color: currentTheme.textMuted }]}>
              {userSettings?.theme === 'dark' ? 'Dark' : 'Light'}
            </Text>
          </View>
          <Switch 
            value={userSettings ? userSettings.theme === 'dark' : false}
            onValueChange={handleThemeToggle}
            trackColor={{ false: currentTheme.border, true: `${colors.primary}80` }}
            // Use a consistent thumb color based on the value to avoid flicker
            thumbColor={(userSettings && userSettings.theme === 'dark') ? colors.primary : currentTheme.textMuted}
            testID="theme-toggle"
          />
        </View>
        
        <View style={[styles.settingItem, { backgroundColor: currentTheme.card }]}>
          <View style={styles.settingIconContainer}>
            <Feather name="bell" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Notifications</Text>
            <Text style={[styles.settingDescription, { color: currentTheme.textMuted }]}>
              Enable push notifications
            </Text>
          </View>
          <Switch
            value={userSettings?.notifications_enabled || false}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: currentTheme.border, true: `${colors.primary}80` }}
            thumbColor={userSettings?.notifications_enabled ? colors.primary : currentTheme.textMuted}
            testID="notifications-toggle"
          />
        </View>
        

      </View>
      
      {/* Integrations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Integrations</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: currentTheme.card }]}
          onPress={handleCalendarSync}
          testID="calendar-sync-button"
        >
          <View style={styles.settingIconContainer}>
            <Feather name="calendar" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Sync with Calendar</Text>
            <Text style={[styles.settingDescription, { color: currentTheme.textMuted }]}>
              Add your tasks as events to your device's calendar
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={currentTheme.textMuted} />
        </TouchableOpacity>
      </View>
      
      {/* Subscription */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Subscription</Text>
        
        <View style={[styles.subscriptionCard, { backgroundColor: currentTheme.card }]}>
          <View style={styles.subscriptionHeader}>
            <Text style={[styles.subscriptionTitle, { color: currentTheme.text }]}>
              {subscription?.plan === 'free' ? 'Free Plan' : 
               subscription?.plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}
            </Text>
            {subscription?.plan !== 'free' && (
              <View style={styles.premiumBadge}>
                <MaterialCommunityIcons name="crown" size={12} color={colors.white} />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.subscriptionDescription, { color: currentTheme.textMuted }]}>
            {subscription?.plan === 'free' 
              ? 'Limited to 3 active reminders. Upgrade for unlimited features and calendar sync.'
              : subscription?.plan === 'monthly'
              ? 'Monthly subscription - $4.99/month. Unlimited reminders and premium features.'
              : 'Yearly subscription - $39.99/year. Save 33% with unlimited reminders and premium features.'}
          </Text>
          
          {subscription?.plan !== 'free' && subscription?.period_end && (
            <Text style={[styles.subscriptionPeriod, { color: currentTheme.textMuted }]}>
              Next billing date: {new Date(subscription.period_end).toLocaleDateString()}
            </Text>
          )}
          
          {subscription?.plan === 'free' ? (
            <Button 
              title="Upgrade Now" 
              onPress={handleUpgrade}
              variant="primary"
              style={styles.subscriptionButton}
              leftIcon={<MaterialCommunityIcons name="crown" size={16} color={colors.white} />}
            />
          ) : (
            <Button 
              title="Manage Subscription" 
              onPress={handleManageSubscription}
              variant="outline"
              style={styles.subscriptionButton}
            />
          )}
        </View>
      </View>
      
      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>About</Text>
        
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: currentTheme.card }]}>
          <View style={styles.settingIconContainer}>
            <Feather name="info" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: currentTheme.text }]}>About D0t Reminds</Text>
          </View>
          <Feather name="chevron-right" size={20} color={currentTheme.textMuted} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: currentTheme.card }]}
          onPress={handleLogout}
          testID="logout-button"
        >
          <View style={styles.settingIconContainer}>
            <Feather name="log-out" size={20} color={colors.error} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.error }]}>
              Logout
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={currentTheme.textMuted} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.version, { color: currentTheme.textMuted }]}>Version 1.0.0</Text>

      {/* Subscription Plan Modal */}
      <OptionModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Choose Your Plan"
        options={subscriptionOptions}
        selectedValue="" // No pre-selected value
        onSelect={(plan) => handleSubscriptionChange(plan as 'monthly' | 'yearly')}
      />

      {/* Calendar Selection Modal */}
      <OptionModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        title="Choose a Calendar to Sync"
        description="For non-Google accounts, you must enable them in your Google Calendar settings to see synced events."
        options={calendarOptions}
        selectedValue={userSettings?.calendar_id || ''}
        onSelect={handleSelectCalendar}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  upgradeButton: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  subscriptionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  subscriptionPeriod: {
    fontSize: 14,
    marginBottom: 16,
  },
  subscriptionButton: {
    marginTop: 16,
  },
  version: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});