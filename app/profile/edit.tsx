import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() { // This file was not provided in the context, so I cannot apply changes to it.
  const { user, userSchedule, getCurrentTheme, updateUser, updateUserSchedule } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const [name, setName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(user?.avatar_url || null); // Can be URL or Base64 URI
  const [sleepTime, setSleepTime] = useState(userSchedule?.sleep_time || '22:00');
  const [wakeTime, setWakeTime] = useState(userSchedule?.wake_up_time || '06:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'sleep' | 'wake'>('sleep');
  const [show2FAEnrollment, setShow2FAEnrollment] = useState(false);
  const [qrCode, setQrCode] = useState(''); // This will still hold the SVG data URI, but we won't use it for rendering
  const [secret, setSecret] = useState('');
  const [mfaCode, setMfaCode] = useState(''); // For confirming enrollment
  const [otpAuthUri, setOtpAuthUri] = useState(''); // To store the otpauth URI for QR code generation
  const [factorId, setFactorId] = useState('');
  
  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Error', 'Please enter your name');
      return;
    }
    
    if (!user) {
      showAlert('Error', 'User not loaded.');
      return;
    }

    setIsSaving(true);
    
    try {
      const updates: { name?: string; image?: string | null } = {};
      let hasChanges = false;

      if (name !== user.full_name) {
        updates.name = name;
        hasChanges = true;
      }
      // If a new avatar was selected (it will be a base64 string), send it.
      if (avatarImage && avatarImage.startsWith('data:image')) {
        updates.image = avatarImage;
        hasChanges = true;
      }

      if (sleepTime !== userSchedule?.sleep_time || wakeTime !== userSchedule?.wake_up_time) {
        await updateUserSchedule({ sleep_time: sleepTime, wake_up_time: wakeTime });
        // We don't set hasChanges here because it's a separate API call.
        // In a more advanced setup, you might combine these into one backend call.
      }

      // Only call API if there are actual changes
      if (hasChanges) {
        await updateUser(user.id, updates);
      } else {
        // If only schedule changed, we still show success.
        if (sleepTime === userSchedule?.sleep_time && wakeTime === userSchedule?.wake_up_time) {
          showAlert('Info', 'No changes to save.');
        }
        setIsSaving(false);
        return;
      }

      showAlert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error in handleSave:', error);
      showAlert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChangeAvatar = async () => {
    // Request permission to access the media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Compress image to reduce base64 string size
      base64: true, // This is the key to get the image as text
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatarImage(base64Image);
    }
  };

  // A simple cross-platform alert
  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  const onTimeChange = (event: any, selectedTimeValue?: Date) => {
    setShowTimePicker(false);
    if (selectedTimeValue) {
      const formattedTime = selectedTimeValue.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
      if (timePickerMode === 'sleep') {
        setSleepTime(formattedTime);
      } else {
        setWakeTime(formattedTime);
      }
    }
  }

    async function handle2FAEnrollment() {
    setIsSaving(true);
    try {
      // 1. Fetch current user's MFA factors
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
        showAlert('Error', getUserError.message);
        return;
      }

      // 2. Unenroll existing factors (if any)
      if (user && user.factors && user.factors.length > 0) {
        for (const factor of user.factors) {
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (unenrollError) {
            console.error('Error unenrolling existing MFA factor:', unenrollError);
            // Decide whether to stop or continue if unenrollment fails for one factor
            showAlert('Error', `Failed to unenroll existing 2FA factor: ${unenrollError.message}`);
            setIsSaving(false);
            return;
          }
        }
        showAlert('Info', 'Existing 2FA factors have been removed.');
      }

      // 3. Proceed with new enrollment
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) {
        console.log('Supabase MFA enroll error:', error);
        showAlert('Error', error.message);
      } else if (data) {
        console.log('Supabase MFA enroll data:', data); // Add this line
        setFactorId(data.id);
        setQrCode(data.totp.qr_code); // Still storing the SVG, but not using it for rendering
        setSecret(data.totp.secret);
        setOtpAuthUri(data.totp.uri); // Store the otpauth URI for QR code generation
        setShow2FAEnrollment(true);
        showAlert('Enrollment Initiated', 'Scan the QR code with your authenticator app and enter the code to verify.');
      }
      } catch (e: any) {
      Alert.alert('An unexpected error occurred during 2FA enrollment', e.message);
    } finally {
      setIsSaving(false);
    }
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: currentTheme.background },
          headerTintColor: currentTheme.text,
          headerTitleStyle: { fontWeight: '600' },
        }} 
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: currentTheme.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarImage ? (
              <Image
                source={{ uri: avatarImage }}
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleChangeAvatar}
              testID="change-avatar-button"
            >
              <Feather name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.changeAvatarText, { color: currentTheme.textMuted }]}>
            Tap to change avatar
          </Text>
        </View>
        
        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: currentTheme.text }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
              <Feather name="user" size={20} color={currentTheme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: currentTheme.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={currentTheme.textMuted}
                testID="name-input"
              />
            </View>
          </View>
          
          {/* Email Field (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: currentTheme.text }]}>Email Address</Text>
            <View style={[styles.inputContainer, styles.disabledInput, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
              <Text style={[styles.disabledText, { color: currentTheme.textMuted }]}>
                {user?.email}
              </Text>
            </View>
            <Text style={[styles.helperText, { color: currentTheme.textMuted }]}>
              Email cannot be changed for security reasons
            </Text>
          </View>

          {/* Schedule Section */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: currentTheme.text }]}>Daily Schedule</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: currentTheme.textMuted }]}>Wake-up Time</Text>
                <TouchableOpacity onPress={() => { setTimePickerMode('wake'); setShowTimePicker(true); }}>
                  <Text style={[styles.timeValue, { color: currentTheme.text }]}>{wakeTime}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: currentTheme.textMuted }]}>Sleep Time</Text>
                <TouchableOpacity onPress={() => { setTimePickerMode('sleep'); setShowTimePicker(true); }}>
                  <Text style={[styles.timeValue, { color: currentTheme.text }]}>{sleepTime}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={new Date(`1970-01-01T${timePickerMode === 'sleep' ? sleepTime : wakeTime}:00`)}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* 2FA Section */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: currentTheme.text }]}>Two-Factor Authentication</Text>
            {!show2FAEnrollment ? (
              <Button
                title="Enable 2FA"
                onPress={handle2FAEnrollment}
                variant="secondary"
                disabled={isSaving}
              />
            ) : (
              <View>
                <Text style={[styles.helperText, { color: currentTheme.textMuted }]}>
                  Scan this QR code with your authenticator app:
                </Text>
                {otpAuthUri && <QRCode value={otpAuthUri} size={150} />} 
                <Text style={[styles.helperText, { color: currentTheme.textMuted }]}>
                  Or manually enter this secret: {secret}
                </Text>
                <TextInput
                  style={[styles.textInput, { color: currentTheme.text, backgroundColor: currentTheme.card, borderColor: currentTheme.border }]} 
                  onChangeText={setMfaCode}
                  value={mfaCode}
                  placeholder="Enter code from app to verify enrollment"
                  keyboardType="numeric"
                  placeholderTextColor={currentTheme.textMuted}
                />
                <Button
                  title={isSaving ? 'Confirming...' : 'Confirm 2FA Enrollment'}
                  onPress={async () => {
                    setIsSaving(true);
                    try {
                      const { error } = await supabase.auth.mfa.verify({
                        factorId: factorId, 
                        code: mfaCode,
                        challengeId: '', // Challenge ID is not needed for enrollment verification
                      });
                      if (error) {
                        showAlert('Error', error.message);
                      } else {
                        showAlert('Success!', '2FA has been successfully enabled.');
                        setShow2FAEnrollment(false);
                        setMfaCode('');
                      }
                    } catch (e: any) {
                      showAlert('An unexpected error occurred during 2FA verification', e.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  variant="primary"
                  disabled={isSaving}
                />
              </View>
            )}
          </View>
        </View>
        
        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            variant="primary"
            disabled={isSaving}
            leftIcon={<Feather name="save" size={16} color={colors.white} />}
            testID="save-button"
          />
        </View>
      </ScrollView>
    </>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  changeAvatarText: {
    fontSize: 14,
  },
  formSection: {
    marginBottom: 32,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  disabledInput: {
    opacity: 0.6,
  },
  disabledText: {
    fontSize: 16,
    paddingVertical: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 16,
  },
  qrCode: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginVertical: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '500',
  },
});