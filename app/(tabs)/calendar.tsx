import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore, useTasksByDate } from '@/hooks/useAppStore';
import { CalendarView } from '@/components/ui/CalendarView';
import { TaskCard } from '@/components/ui/TaskCard';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Task } from '@/types';

type CalendarViewType = 'month' | 'day';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const { getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  const tasks = useTasksByDate(selectedDate);
  
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };
  
  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };
  
  const { deleteTask } = useAppStore();
  
  const handleDeleteTask = (task: Task) => {
    deleteTask(task.id);
  };
  
  const handleAddTask = () => {
    router.push({
      pathname: '/task/create',
      params: { date: selectedDate }
    });
  };
  
  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const renderCalendarContent = () => {
    switch (viewType) {
      case 'month':
        return (
          <CalendarView 
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
            viewType="month"
          />
        );
      case 'day':
        return (
          <View style={[styles.dayView, { backgroundColor: currentTheme.card }]}>
            <Text style={[styles.dayViewTitle, { color: currentTheme.text }]}>
              {formatSelectedDate()}
            </Text>
            <ScrollView style={styles.hoursContainer}>
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i.toString().padStart(2, '0');
                const hourTasks = tasks.filter(task => {
                  if (!task.due_at) return false;
                  const taskHour = new Date(task.due_at).getHours();
                  return taskHour === i;
                });
                
                return (
                  <View key={i} style={[styles.hourSlot, { borderBottomColor: currentTheme.textMuted + '20' }]}>
                    <Text style={[styles.hourLabel, { color: currentTheme.textMuted }]}>
                      {hour}:00
                    </Text>
                    <View style={styles.hourContent}>
                      {hourTasks.map(task => (
                        <TouchableOpacity
                          key={task.id}
                          style={[styles.hourTask, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleTaskPress(task)}
                        >
                          <Text style={[styles.hourTaskText, { color: colors.primary }]}>
                            {task.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* View type selector */}
        <View style={[styles.viewSelector, { backgroundColor: currentTheme.card }]}>
          <TouchableOpacity
            style={[
              styles.viewOption,
              viewType === 'month' && styles.selectedViewOption
            ]}
            onPress={() => setViewType('month')}
            testID="month-view"
          >
            <Feather 
              name="calendar"
              size={18} 
              color={viewType === 'month' ? colors.white : currentTheme.textMuted} 
            />
            <Text 
              style={[
                styles.viewOptionText,
                { color: currentTheme.textMuted },
                viewType === 'month' && styles.selectedViewOptionText
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.viewOption,
              viewType === 'day' && styles.selectedViewOption
            ]}
            onPress={() => setViewType('day')}
            testID="day-view"
          >
            <Feather 
              name="clock"
              size={18} 
              color={viewType === 'day' ? colors.white : currentTheme.textMuted} 
            />
            <Text 
              style={[
                styles.viewOptionText,
                { color: currentTheme.textMuted },
                viewType === 'day' && styles.selectedViewOptionText
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Calendar Content */}
        {renderCalendarContent()}
        
        {/* Selected date tasks - only show for month view */}
        {viewType === 'month' && (
          <View style={styles.tasksContainer}>
            <Text style={[styles.dateTitle, { color: currentTheme.text }]}>
              {formatSelectedDate()}
            </Text>
            
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>No tasks for this day</Text>
                <Text style={[styles.emptyStateSubtext, { color: currentTheme.textMuted }]}>
                  Add a task to get started
                </Text>
              </View>
            ) : (
              <View style={styles.taskListContainer}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onPress={handleTaskPress}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Add task button - pinned */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddTask}
        testID="add-task-button"
      >
        <Feather name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  viewSelector: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 8,
    padding: 4,
  },
  viewOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  selectedViewOption: {
    backgroundColor: colors.primary,
  },
  viewOptionText: {
    fontSize: 14,
  },
  selectedViewOptionText: {
    color: colors.white,
    fontWeight: '500',
  },
  tasksContainer: {
    marginTop: 8,
  },
  taskListContainer: {
    gap: 8,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  dayView: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 400,
  },
  dayViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  hoursContainer: {
    flex: 1,
  },
  hourSlot: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
  },
  hourLabel: {
    width: 60,
    fontSize: 12,
    paddingTop: 4,
  },
  hourContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  hourTask: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  hourTaskText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
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

});