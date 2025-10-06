import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert,
  SafeAreaView,
  PanResponder,
  Modal,
  Keyboard
} from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type NotifyOption = 'on_time' | '1_day_before' | '2_days_before' | 'custom';
type LocationOption = 'none' | 'home' | 'work' | 'custom';

export default function CreateTaskScreen() {
  const { addTask, getCurrentTheme, categories, tasks, subscription, isLoading } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [repeatOption, setRepeatOption] = useState<RepeatOption>('none');
  const [notifyOption, setNotifyOption] = useState<NotifyOption>('on_time');
  const [locationOption, setLocationOption] = useState<LocationOption>('none');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [, setKeyboardVisible] = useState(false);
  
  // Modal states
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<'date' | 'time'>('date');
  
  const descriptionInputRef = useRef<TextInput>(null);
  
  useEffect(() => {
    // Set the initial category ID once categories are loaded
    if (categories.length > 0 && selectedCategoryId === '') {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleTitleChange = (text: string) => {
    setTitle(text);
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
  };

  const handleDateTimeChange = (date: Date, time: Date) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleRepeatChange = (option: RepeatOption) => {
    setRepeatOption(option);
  };

  const handleNotifyChange = (option: NotifyOption) => {
    setNotifyOption(option);
  };

  const handleLocationChange = (option: LocationOption) => {
    setLocationOption(option);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };
  
  // A simple cross-platform alert
  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  const repeatOptions: { value: RepeatOption; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ];
  
  const notifyOptions: { value: NotifyOption; label: string }[] = [
    { value: 'on_time', label: 'On time' },
    { value: '1_day_before', label: '1 day before' },
    { value: '2_days_before', label: '2 days before' },
    { value: 'custom', label: 'Custom' },
  ];
  
  const locationOptions: { value: LocationOption; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'home', label: 'At Home' },
    { value: 'work', label: 'At Work' },
    { value: 'custom', label: 'Custom Location' },
  ];
  
  const handleSaveAndClose = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter a task title');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (!selectedCategoryId) {
      showAlert('Error', 'Please select a category for the task.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Check if the user is on a free plan and has reached the task limit
    if (subscription?.plan === 'free' && tasks.length >= 3) {
      showAlert('Task Limit Reached', 'Free users can only create up to 3 tasks. Please upgrade to Premium for unlimited tasks.');
      return;
    }
    
    const dueDateTime = new Date(selectedDate);
    dueDateTime.setHours(selectedTime.getHours());
    dueDateTime.setMinutes(selectedTime.getMinutes());

    const calculateReminderDate = (due: Date, option: NotifyOption): Date | undefined => {
      if (option === 'on_time') {
        return due;
      }
      const reminder = new Date(due);
      if (option === '1_day_before') {
        reminder.setDate(reminder.getDate() - 1);
        return reminder;
      }
      if (option === '2_days_before') {
        reminder.setDate(reminder.getDate() - 2);
        return reminder;
      }
      // For 'custom' or other cases, you might open another picker
      // For now, we'll treat 'custom' as 'on_time'
      return due;
    };

    const reminderDateTime = calculateReminderDate(dueDateTime, notifyOption);
    
    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      category_id: selectedCategoryId,
      due_at: dueDateTime.toISOString(),
      repeat_rule: repeatOption !== 'none' ? repeatOption : undefined,
      reminder_at: reminderDateTime?.toISOString(),
    };
    
    console.log('Sending to task/create with parameters:', taskData);
    try {
      await addTask(taskData);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      router.back();
    } catch (error) {
      console.error("Failed to create task:", error);
      showAlert("Error", "Could not create the task. Please check your connection and try again.");
    }
  };
  
  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical movements that are downward
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down far enough, close the modal
        if (gestureState.dy > 100) {
          router.back();
        }
      }
    })
  ).current;
  
  const formatDateTime = (date: Date, time: Date) => {
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  };
  
  const handleDateTimePickerChange = (event: any, selectedDateTime?: Date) => {
    const currentDate = selectedDateTime || (dateTimeMode === 'date' ? selectedDate : selectedTime);
    setShowDateTimeModal(Platform.OS === 'ios'); // Keep modal open on iOS for time picking
    
    if (event.type === 'set') { // 'set' means the user confirmed a date/time
      if (dateTimeMode === 'date') {
        setSelectedDate(currentDate);
        // Immediately trigger the time picker to show next
        setDateTimeMode('time');
        setShowDateTimeModal(true); 
      } else { // dateTimeMode === 'time'
        setSelectedTime(currentDate);
        setShowDateTimeModal(false); // Close modal after time is picked
      }
    } else { // 'dismissed' or 'neutralButtonPressed'
      setShowDateTimeModal(false);
    }
  };
  
  const openDateTimePicker = () => {
    setDateTimeMode('date');
    setShowDateTimeModal(true);
  };
  
  const getSelectedCategory = () => {
    // Find the selected category, or fall back to the first one, or return a placeholder if none exist.
    return categories.find(cat => cat.id === selectedCategoryId) 
      || categories[0] 
      || { name: 'Loading...', color: colors.grey };
  };
  
  const renderOptionModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                selectedValue === option.value && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[
                styles.modalOptionText,
                { color: currentTheme.text },
                selectedValue === option.value && { color: colors.primary }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.modalCloseButton, { backgroundColor: currentTheme.card }]}
            onPress={onClose}
          >
            <Text style={[styles.modalCloseText, { color: currentTheme.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header with swipe down gesture */}
      <View 
        {...panResponder.panHandlers}
        style={[styles.header, { backgroundColor: currentTheme.background }]}
      >
        <View style={styles.swipeIndicator} />
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Task name input */}
          <View style={styles.taskNameContainer}>
            <View style={[styles.taskNameIndicator, { backgroundColor: colors.primary }]} />
            <TextInput
              style={[styles.taskNameInput, { color: currentTheme.text }]}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Task name"
              placeholderTextColor={currentTheme.textMuted}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              testID="task-title-input"
            />
          </View>
          
          {/* Note input */}
          <TextInput
            ref={descriptionInputRef}
            style={[styles.noteInput, { color: currentTheme.textMuted }]}
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder="Note"
            placeholderTextColor={currentTheme.textMuted}
            multiline
            testID="task-description-input"
          />
      
          {/* Action buttons row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.dateTimeButton, { backgroundColor: colors.primary }]}
              onPress={openDateTimePicker}
              testID="datetime-button"
            >
              <Feather name="calendar" size={20} color={colors.white} />
              <Text style={[styles.dateTimeButtonText, { color: colors.white }]}>{formatDateTime(selectedDate, selectedTime)}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: currentTheme.card }]}
              onPress={() => setShowRepeatModal(true)}
              testID="repeat-button"
            >
              <Feather name="repeat" size={20} color={currentTheme.text} />
              <Text style={[styles.actionButtonText, { color: currentTheme.text }]}>
                {repeatOptions.find(opt => opt.value === repeatOption)?.label || 'None'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: currentTheme.card }]}
              onPress={() => setShowNotifyModal(true)}
              testID="notify-button"
            >
              <Feather name="bell" size={20} color={currentTheme.text} />
              <Text style={[styles.actionButtonText, { color: currentTheme.text }]}>
                {notifyOptions.find(opt => opt.value === notifyOption)?.label || 'On time'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: currentTheme.card }]}
              onPress={() => setShowLocationModal(true)}
              testID="location-button"
            >
              <Feather name="map-pin" size={20} color={currentTheme.text} />
              <Text style={[styles.actionButtonText, { color: currentTheme.text }]}>
                {locationOptions.find(opt => opt.value === locationOption)?.label || 'None'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Category selection */}
          {categories.length > 0 && (
            <TouchableOpacity 
              style={[styles.categorySelector, { backgroundColor: getSelectedCategory().color }]}
              onPress={() => setShowCategoryModal(true)}
              testID="category-selector"
            >
              <Text style={[styles.categorySelectorText, { color: colors.white }]}>{getSelectedCategory().name}</Text>
              <Feather name="chevron-down" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
          
          {/* Add Task Button - Moved to content area */}
          <TouchableOpacity 
            style={[styles.addTaskButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveAndClose}
            disabled={isLoading}
            testID="add-task-button"
          >
            <Feather name="plus" size={20} color={colors.white} />
            <Text style={[styles.addTaskButtonText, { color: colors.white }]}>Add Task</Text>
          </TouchableOpacity>
      
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* DateTime Modal */}
      <Modal
        visible={showDateTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dateTimeModalContent, { backgroundColor: currentTheme.background }]}>
            <View style={styles.dateTimeModalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {dateTimeMode === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              {Platform.OS === 'ios' && dateTimeMode === 'date' && (
                <TouchableOpacity
                  style={[styles.switchModeButton, { backgroundColor: colors.primary }]}
                  onPress={() => setDateTimeMode('time')}
                >
                  <Text style={[styles.switchModeText, { color: colors.white }]}>Next: Time</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <DateTimePicker
              value={dateTimeMode === 'date' ? selectedDate : selectedTime}
              mode={dateTimeMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateTimePickerChange}
              style={styles.dateTimePicker}
            />
            
            <View style={styles.dateTimeModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.card }]}
                onPress={() => setShowDateTimeModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (Platform.OS === 'ios' && dateTimeMode === 'date') {
                    setDateTimeMode('time');
                  } else {
                    setShowDateTimeModal(false);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.white }]}>
                  {Platform.OS === 'ios' && dateTimeMode === 'date' ? 'Next' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Repeat Modal */}
      {renderOptionModal(
        showRepeatModal,
        () => setShowRepeatModal(false),
        'Repeat',
        repeatOptions,
        repeatOption,
        (value) => handleRepeatChange(value as RepeatOption)
      )}
      
      {/* Notify Modal */}
      {renderOptionModal(
        showNotifyModal,
        () => setShowNotifyModal(false),
        'Notify',
        notifyOptions,
        notifyOption,
        (value) => handleNotifyChange(value as NotifyOption)
      )}
      
      {/* Location Modal */}
      {renderOptionModal(
        showLocationModal,
        () => setShowLocationModal(false),
        'Location Reminder',
        locationOptions,
        locationOption,
        (value) => handleLocationChange(value as LocationOption)
      )}
      
      {/* Category Modal */}
      {renderOptionModal(
        showCategoryModal,
        () => setShowCategoryModal(false),
        'Category',
        categories.map(cat => ({ value: cat.id, label: cat.name })),
        selectedCategoryId,
        (value) => handleCategoryChange(value)
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    marginBottom: 12,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  taskNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  taskNameIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  taskNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  noteInput: {
    fontSize: 16,
    marginBottom: 40,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
  },
  dateTimeButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    minHeight: 60,
  },
  dateTimeButtonText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
    minHeight: 60,
  },
  actionButtonText: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
  },
  categorySelectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  addTaskButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCloseButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  dateTimeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateTimePicker: {
    width: '100%',
    height: 200,
  },
  dateTimeModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});