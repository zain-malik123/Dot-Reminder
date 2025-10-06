import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import { useAppStore } from '@/hooks/useAppStore';

type CalendarViewProps = {
  onSelectDate: (date: string) => void;
  selectedDate: string;
  viewType?: 'month' | 'week';
};

// Component to render a single day cell
const DayCell: React.FC<{
  day: {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  };
  onPress: (date: Date) => void;
}> = ({ day, onPress }) => {
  const { tasks, getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  // Check if there are tasks for this day
  const dateOnly = day.date.toISOString().split('T')[0];
  const hasTask = useMemo(() => {
    return tasks.some(task => {
      if (!task.due_at) return false;
      return task.due_at.split('T')[0] === dateOnly;
    });
  }, [tasks, dateOnly]);
  
  return (
    <TouchableOpacity
      key={day.date.toString()}
      style={[
        styles.dayCell,
        !day.isCurrentMonth && styles.notCurrentMonth,
        day.isSelected && [styles.selectedDay, { backgroundColor: colors.primary }],
        day.isToday && !day.isSelected && [styles.today, { borderColor: colors.primary }],
      ]}
      onPress={() => onPress(day.date)}
      testID={`day-${day.date.getDate()}`}
    >
      <Text
        style={[
          styles.dayText,
          { color: currentTheme.text },
          !day.isCurrentMonth && [styles.notCurrentMonthText, { color: currentTheme.textMuted }],
          day.isSelected && styles.selectedDayText,
          day.isToday && !day.isSelected && [styles.todayText, { color: colors.primary }],
        ]}
      >
        {day.date.getDate()}
      </Text>
      
      {hasTask && (
        <View 
          style={[
            styles.taskDot, 
            { 
              backgroundColor: day.isSelected 
                ? colors.white 
                : (currentTheme.background === colors.black ? colors.primary : colors.primary)
            }
          ]} 
        />
      )}
    </TouchableOpacity>
  );
};

// Component to render the grid of days
const DaysGrid: React.FC<{
  days: {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[];
  handleSelectDate: (date: Date) => void;
}> = ({ days, handleSelectDate }) => {
  return (
    <View style={styles.daysGrid}>
      {days.map((day, index) => (
        <DayCell 
          key={index} 
          day={day} 
          onPress={handleSelectDate} 
        />
      ))}
    </View>
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  onSelectDate,
  selectedDate,
  viewType = 'month'
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const { getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  // Generate days for the current view
  const generateDays = () => {
    if (viewType === 'week') {
      return generateWeekDays();
    }
    return generateMonthDays();
  };
  
  // Generate days for the current month
  const generateMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the last day of the previous month
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, lastDayPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, new Date(selectedDate)),
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, new Date(selectedDate)),
      });
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // 6 rows of 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, new Date(selectedDate)),
      });
    }
    
    return days;
  };
  
  // Generate days for the current week
  const generateWeekDays = () => {
    const selectedDateObj = new Date(selectedDate);
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, new Date(selectedDate)),
      });
    }
    
    return days;
  };
  
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };
  
  const days = generateDays();
  
  const handlePrev = () => {
    if (viewType === 'week') {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 7);
      onSelectDate(newDate.toISOString());
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };
  
  const handleNext = () => {
    if (viewType === 'week') {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 7);
      onSelectDate(newDate.toISOString());
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };
  
  const handleSelectDate = (date: Date) => {
    onSelectDate(date.toISOString());
  };
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getHeaderTitle = () => {
    if (viewType === 'week') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startOfWeek.toLocaleDateString(undefined, { month: 'short' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
      }
    }
    return currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };
  
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrev} testID="prev-period">
          <Feather name="chevron-left" size={24} color={currentTheme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthTitle, { color: currentTheme.text }]}>
          {getHeaderTitle()}
        </Text>
        
        <TouchableOpacity onPress={handleNext} testID="next-period">
          <Feather name="chevron-right" size={24} color={currentTheme.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.weekDays}>
        {weekDays.map((day) => (
          <Text key={day} style={[styles.weekDay, { color: currentTheme.textMuted }]}>
            {day}
          </Text>
        ))}
      </View>
      
      <DaysGrid 
        days={days} 
        handleSelectDate={handleSelectDate} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  dayText: {
    fontSize: 14,
  },
  notCurrentMonth: {
    opacity: 0.4,
  },
  notCurrentMonthText: {
  },
  selectedDay: {
    borderRadius: 20,
    backgroundColor: '#4285F4',
  },
  selectedDayText: {
    color: colors.white,
    fontWeight: '600',
  },
  today: {
    borderWidth: 1,
    borderRadius: 20,
  },
  todayText: {
    fontWeight: '600',
  },
  taskDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});