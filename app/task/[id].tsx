import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert,
  SafeAreaView,
  View,
  Modal,
} from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type NotifyOption = 'on_time' | '1_day_before' | '2_days_before' | 'custom';
type LocationOption = 'none' | 'home' | 'work' | 'custom';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, categories, updateTask, deleteTask, getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const task = tasks.find((t) => t.id === id);
  
  // Initialize hooks with default values
  
  // Modal states
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<'date' | 'time'>('date');
  
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selectedDate, setSelectedDate] = useState<Date>(task?.due_at ? new Date(task.due_at) : new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(task?.due_at ? new Date(task.due_at) : new Date());
  const [repeatOption, setRepeatOption] = useState<RepeatOption>((task?.repeat_rule as RepeatOption) || 'none');
  const [locationOption, setLocationOption] = useState<LocationOption>('none');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(task?.category_id || (categories[0]?.id || ''));
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const getInitialNotifyOption = (): NotifyOption => {
    // Ensure a valid category is selected on load
    React.useEffect(() => {
      const categoryExists = categories.some(c => c.id === task?.category_id);
      if (task && !categoryExists && categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    }, [task, categories]);


    if (task?.due_at && task.reminder_at) {
      const due = new Date(task.due_at).getTime();
      const reminder = new Date(task.reminder_at).getTime();
      const diffDays = Math.round((due - reminder) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'on_time';
      if (diffDays === 1) return '1_day_before';
      if (diffDays === 2) return '2_days_before';
      return 'custom';
    }
    return 'on_time';
  };
  const [notifyOption, setNotifyOption] = useState<NotifyOption>(getInitialNotifyOption());
  const descriptionInputRef = useRef<TextInput>(null);
  
  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <Text style={[styles.errorText, { color: currentTheme.text }]}>Task not found</Text>
      </View>
    );
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
  
  const handleUpdateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    
    // Combine date and time before calculations
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
      return due; // Default for 'custom' for now
    };

    const reminderDateTime = calculateReminderDate(dueDateTime, notifyOption);
    
    const taskData = {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      category_id: selectedCategoryId,
      due_at: dueDateTime.toISOString(),
      repeat_rule: repeatOption !== 'none' ? repeatOption : undefined,
      reminder_at: reminderDateTime?.toISOString(),
      location_reminder: locationOption !== 'none' ? locationOption : undefined,
    };
    
    console.log('Sending to task/update with parameters:', taskData);
    await updateTask(task.id, taskData);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    router.back();
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            deleteTask(task.id);
            router.back();
          }
        }
      ]
    );
  };
  

  
  const formatDateTime = (date: Date, time: Date) => {
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  };
  
  const handleDateTimeChange = (event: any, selectedDateTime?: Date) => {
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
    return categories.find(cat => cat.id === selectedCategoryId) || categories[0];
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
              onChangeText={setTitle}
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
            onChangeText={setDescription}
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
          <TouchableOpacity 
            style={[styles.categorySelector, { backgroundColor: getSelectedCategory().color }]}
            onPress={() => setShowCategoryModal(true)}
            testID="category-selector"
          >
            <Text style={[styles.categorySelectorText, { color: colors.white }]}>{getSelectedCategory()?.name}</Text>
            <Feather name="chevron-down" size={16} color={colors.white} />
          </TouchableOpacity>
      
        </ScrollView>
        
        {/* Update button - Fixed position that stays visible with keyboard */}
        <TouchableOpacity 
          style={[
            styles.updateButton,
            keyboardVisible && styles.updateButtonKeyboard
          ]}
          onPress={handleUpdateTask}
          testID="update-task-button"
        >
          <Feather name="arrow-up" size={24} color={colors.white} />
        </TouchableOpacity>
        
        {/* Delete button - Fixed position */}
        <TouchableOpacity 
          style={[
            styles.deleteButton,
            keyboardVisible && styles.deleteButtonKeyboard
          ]}
          onPress={handleDelete}
          testID="delete-task-button"
        >
          <Feather name="trash-2" size={24} color={colors.white} />
        </TouchableOpacity>
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
              onChange={handleDateTimeChange}
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
        (value) => setRepeatOption(value as RepeatOption)
      )}
      
      {/* Notify Modal */}
      {renderOptionModal(
        showNotifyModal,
        () => setShowNotifyModal(false),
        'Notify',
        notifyOptions,
        notifyOption,
        (value) => setNotifyOption(value as NotifyOption)
      )}
      
      {/* Location Modal */}
      {renderOptionModal(
        showLocationModal,
        () => setShowLocationModal(false),
        'Location Reminder',
        locationOptions,
        locationOption,
        (value) => setLocationOption(value as LocationOption)
      )}
      
      {/* Category Modal */}
      {renderOptionModal(
        showCategoryModal,
        () => setShowCategoryModal(false),
        'Category',
        categories.map(cat => ({ value: cat.id, label: cat.name })),
        selectedCategoryId,
        (value) => setSelectedCategoryId(value)
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
    paddingBottom: 120,
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
  updateButton: {
    position: 'absolute',
    bottom: 34,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  updateButtonKeyboard: {
    bottom: Platform.OS === 'ios' ? 320 : 280,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 34,
    right: 92,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#666',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  deleteButtonKeyboard: {
    bottom: Platform.OS === 'ios' ? 320 : 280,
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
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});