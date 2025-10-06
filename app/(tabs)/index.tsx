import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, SectionList, TouchableOpacity, ScrollView, Alert, Animated, PanResponder, RefreshControl } from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore, useTasksByCategory, useTasksByDate } from '@/hooks/useAppStore';
import { TaskCard } from '@/components/ui/TaskCard';
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { Task, Category } from '@/types';
import { CalendarView } from '@/components/ui/CalendarView';

export default function TasksScreen() {
  const { categories, deleteCategory, getCurrentTheme, triggerRefresh, isRefreshing } = useAppStore();
  const currentTheme = getCurrentTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryActions, setShowCategoryActions] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  
  // Get tasks based on category and date filters
  const categoryTasks = useTasksByCategory(selectedCategory);
  const dateTasks = useTasksByDate(selectedDate);
  
  // If a date is selected, filter by date, otherwise show all tasks for the selected category
  const tasks = showCalendar ? dateTasks : categoryTasks;
  
  // Automatically refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Tasks screen focused, triggering data refresh.');
      triggerRefresh();
    }, [triggerRefresh])
  );
  
  const incompleteTasks = tasks.filter(task => !task.completed_at);
  const completedTasks = tasks.filter(task => task.completed_at);

  const taskSections = [];
  if (incompleteTasks.length > 0) {
    taskSections.push({ title: 'Tasks', data: incompleteTasks });
  }
  if (completedTasks.length > 0) {
    taskSections.push({ title: 'Completed', data: completedTasks });
  }
  
  // Animation values for calendar
  const calendarHeight = 350; // Height of the calendar when fully expanded
  const calendarPosition = useRef(new Animated.Value(-calendarHeight)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  
  // Track calendar position for conditional rendering
  const [calendarPositionValue, setCalendarPositionValue] = useState<number>(-calendarHeight);
  calendarPosition.addListener(({value}) => setCalendarPositionValue(value));
  
  // Format the selected date for display
  const formatHeaderDate = useCallback(() => {
    const date = new Date(selectedDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }, [selectedDate]);
  

  
  // Handle date selection from calendar
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    // When a date is selected, make sure we're in date filter mode
    if (!showCalendar) {
      setShowCalendar(true);
    }
  };
  
  // Pan responder for swipe down to show calendar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical movements that are downward
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!showCalendar && gestureState.dy > 0) {
          // Calculate position based on gesture, but cap at 0 (fully open)
          const newPosition = Math.min(0, -calendarHeight + gestureState.dy);
          calendarPosition.setValue(newPosition);
          
          // Calculate opacity based on position
          const newOpacity = (newPosition + calendarHeight) / calendarHeight;
          calendarOpacity.setValue(newOpacity);
        } else if (showCalendar && gestureState.dy < 0) {
          // Allow dragging up to close if calendar is open
          const newPosition = Math.max(-calendarHeight, gestureState.dy);
          calendarPosition.setValue(newPosition);
          
          // Calculate opacity based on position
          const newOpacity = 1 + (newPosition / calendarHeight);
          calendarOpacity.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down far enough, show calendar
        if (!showCalendar && gestureState.dy > calendarHeight / 3) {
          setShowCalendar(true);
          Animated.parallel([
            Animated.spring(calendarPosition, {
              toValue: 0,
              useNativeDriver: false,
              friction: 8
            }),
            Animated.timing(calendarOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false
            })
          ]).start();
        } else if (!showCalendar) {
          // Not swiped far enough, reset
          Animated.parallel([
            Animated.timing(calendarPosition, {
              toValue: -calendarHeight,
              duration: 200,
              useNativeDriver: false
            }),
            Animated.timing(calendarOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false
            })
          ]).start();
        } else if (showCalendar && gestureState.dy < -calendarHeight / 3) {
          // If calendar is open and swiped up far enough, hide it
          Animated.parallel([
            Animated.timing(calendarPosition, {
              toValue: -calendarHeight,
              duration: 300,
              useNativeDriver: false
            }),
            Animated.timing(calendarOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false
            })
          ]).start(() => setShowCalendar(false));
        } else if (showCalendar) {
          // Not swiped far enough to close, reset to open
          Animated.parallel([
            Animated.spring(calendarPosition, {
              toValue: 0,
              useNativeDriver: false,
              friction: 8
            }),
            Animated.timing(calendarOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false
            })
          ]).start();
        }
      }
    })
  ).current;
  
  const handleTaskPress = (task: Task) => {
    router.push(`/task/edit/${task.id}`);
  };
  
  const { deleteTask } = useAppStore();
  
  const handleDeleteTask = (task: Task) => {
    // In a real app, we would show a confirmation dialog
    // For now, we'll just delete the task
    deleteTask(task.id);
  };
  
  const handleAddTask = () => {
    router.push('/task/create');
  };
  
  const handleAddCategory = () => {
    router.push('/category/create');
  };
  
  const handleEditCategory = (category: Category) => {
    router.push(`/category/edit/${category.id}`);
    setShowCategoryActions(null);
  };
  
  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? Tasks in this category will be moved to uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCategory(category.id);
            if (selectedCategory === category.id) {
              setSelectedCategory(null);
            }
            setShowCategoryActions(null);
          },
        },
      ]
    );
  };
  
  const handleCategoryLongPress = (categoryId: string) => {
    setShowCategoryActions(showCategoryActions === categoryId ? null : categoryId);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Calendar overlay */}
      {(showCalendar || calendarPositionValue > -calendarHeight) && (
        <Animated.View 
          style={[
            styles.calendarContainer,
            { 
              transform: [{ translateY: calendarPosition }],
              opacity: calendarOpacity,
              backgroundColor: currentTheme.background,
            }
          ]}
        >
          <CalendarView 
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            viewType="month"
          />
        </Animated.View>
      )}
      
      {/* Category filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilters}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: currentTheme.card },
            selectedCategory === null && styles.selectedCategoryChip
          ]}
          onPress={() => {
            setSelectedCategory(null);
            setShowCategoryActions(null);
          }}
          testID="all-category-filter"
        >
          <Text 
            style={[
              styles.categoryChipText,
              { color: currentTheme.text },
              selectedCategory === null && styles.selectedCategoryChipText
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        {categories.map((category, index) => (
          <TouchableOpacity
            key={`${category.id}-${index}`}
            style={[
              styles.categoryChip,
              { backgroundColor: `${category.color}20` },
              selectedCategory === category.id && styles.selectedCategoryChip,
              selectedCategory === category.id && { backgroundColor: category.color }
            ]}
            onPress={() => {
              setSelectedCategory(category.id);
              setShowCategoryActions(null);
            }}
            onLongPress={() => handleCategoryLongPress(category.id)}
            testID={`category-filter-${category.id}`}
          >
            <Text 
              style={[
                styles.categoryChipText,
                { color: category.color },
                selectedCategory === category.id && styles.selectedCategoryChipText
              ]}
            >
              {category.name}
            </Text>
            
            {showCategoryActions === category.id && (
              <View style={[styles.categoryActions, { backgroundColor: currentTheme.card }]}>
                <TouchableOpacity
                  style={styles.categoryAction}
                  onPress={() => handleEditCategory(category)}
                  testID={`edit-category-${category.id}`}
                >
                  <Feather name="edit" size={16} color={currentTheme.text} />
                  <Text style={[styles.categoryActionText, { color: currentTheme.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.categoryAction}
                  onPress={() => handleDeleteCategory(category)}
                  testID={`delete-category-${category.id}`}
                >
                  <Feather name="trash-2" size={16} color={colors.error} />
                  <Text style={[styles.categoryActionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[styles.addCategoryChip, { backgroundColor: currentTheme.card }]}
          onPress={handleAddCategory}
          testID="add-category-button"
        >
          <Feather name="plus" size={16} color={currentTheme.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.editCategoryChip, { backgroundColor: currentTheme.card }]}
          onPress={() => router.push('/categories')}
          testID="edit-categories-button"
        >
          <Feather name="edit" size={16} color={currentTheme.text} />
        </TouchableOpacity>
      </ScrollView>
      
      {/* Header with swipe gesture */}
      <View {...panResponder.panHandlers} style={styles.headerContainer}>
        <View style={styles.dateHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            {formatHeaderDate()}
          </Text>
        </View>
        <Text style={[styles.dateSubtitle, { color: currentTheme.textMuted }]}>
          {new Date(selectedDate).toLocaleDateString(undefined, { month: 'long' })}
        </Text>
      </View>
      
      {/* Task list */}
      <SectionList
        sections={taskSections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={({ item, section }) => (
          <TaskCard
            task={item}
            onPress={handleTaskPress}
            onDelete={handleDeleteTask}
          />
        )}
        renderSectionHeader={({ section: { title, data } }) => (
          // Only render header if there are tasks in the section
          data.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: currentTheme.text, marginTop: 20 }]}>{title}</Text>
          ) : null
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>No tasks found</Text>
            <Text style={[styles.emptyStateSubtext, { color: currentTheme.textMuted }]}>
              Add a new task to get started
            </Text>
          </View>
        )}
        contentContainerStyle={styles.taskList}
        showsVerticalScrollIndicator={false}
        testID="task-list"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={triggerRefresh}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
      
      {/* Add task button */}
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
  calendarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  categoryFilters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    minHeight: 60,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskList: {
    paddingHorizontal: 16,
    paddingTop: 0,
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
  },
  addCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 40,
  },
  editCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 40,
  },
  addCategoryText: {
    fontWeight: '500',
    fontSize: 14,
  },
  categoryActions: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  categoryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  categoryActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});