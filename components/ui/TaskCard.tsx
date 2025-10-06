import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { Task } from '@/types';
import { CategoryChip } from './CategoryChip';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/hooks/useAppStore';

type TaskCardProps = {
  task: Task;
  onPress: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onPress, 
  onDelete 
}) => {
  const { completeTask, getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const handleToggleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    completeTask(task.id, !task.completed_at);
  };
  
  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onDelete(task);
  };
  
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Otherwise, return formatted date
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const dueDate = formatDueDate(task.due_at);
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: currentTheme.card },
        task.completed_at ? styles.completedContainer : null
      ]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
      testID="task-card"
    >
      <TouchableOpacity 
        style={[
          styles.checkbox,
          task.completed_at ? styles.checkboxChecked : null
        ]}
        onPress={handleToggleComplete}
        testID="task-checkbox"
      >
  {task.completed_at && <Feather name="check" size={16} color={colors.white} />}
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text 
          style={[
            styles.title,
            { color: currentTheme.text },
            task.completed_at ? [styles.completedTitle, { color: currentTheme.textMuted }] : null
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        
        <View style={styles.details}>
          {task.category_id && (
            <CategoryChip categoryId={task.category_id} small />
          )}
          
          {dueDate && (
            <Text style={[styles.dueDate, { color: currentTheme.textMuted }]}>
              {dueDate}
            </Text>
          )}
        </View>
      </View>
      
        <TouchableOpacity 
        style={styles.deleteButton}
        onPress={handleDelete}
        testID="delete-task-button"
      >
        <Feather name="trash-2" size={16} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  completedContainer: {
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dueDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});