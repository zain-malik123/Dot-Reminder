import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { ChatMessage as ChatMessageType, Task } from '@/types';
import { CategoryChip } from './CategoryChip';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '@/hooks/useAppStore';

type ChatMessageProps = {
  message: ChatMessageType;
  onTaskAction?: (action: string, task: Task) => void;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message,
  onTaskAction
}) => {
  const { tasks, completeTask, getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const task = message.task_action?.task_id 
    ? tasks.find(t => t.id === message.task_action?.task_id) 
    : message.task_action?.task;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null; // Return null for invalid dates
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleComplete = () => {
    if (task) {
      completeTask(task.id, !task.completed_at);
      if (onTaskAction) {
        onTaskAction('complete', task);
      }
    }
  };
  
  const handleOpen = () => {
    if (task && onTaskAction) {
      onTaskAction('open', task);
    }
  };
  
  const handleEdit = () => {
    if (task && onTaskAction) {
      onTaskAction('edit', task);
    }
  };
  
  const handleSnooze = () => {
    if (task && onTaskAction) {
      onTaskAction('snooze', task);
    }
  };
  
  const taskActionButtons = [
    {
      key: 'complete',
      label: task?.completed_at ? 'Undo' : 'Complete',
      icon: 'check' as const,
      onPress: handleComplete,
      testID: 'complete-task-action',
    },
    {
      key: 'open',
      label: 'Open',
      icon: 'arrow-right' as const,
      onPress: handleOpen,
      testID: 'open-task-action',
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: 'edit' as const,
      onPress: handleEdit,
      testID: 'edit-task-action',
    },
    {
      key: 'snooze',
      label: 'Snooze',
      icon: 'clock' as const,
      onPress: handleSnooze,
      testID: 'snooze-task-action',
    },
  ];

  return (
    <View 
      style={[
        styles.container,
        message.is_user 
          ? [styles.userContainer, { backgroundColor: colors.primary }]
          : [styles.assistantContainer, { backgroundColor: currentTheme.card }]
      ]}
      testID="chat-message"
    >
      <Text style={[styles.message, { color: message.is_user ? colors.white : currentTheme.text }]}>
        {message.content}
      </Text>
      
      {/* Task action card */}
      {message.task_action && task && (
        <View style={[styles.taskCard, { backgroundColor: `${currentTheme.background}80` }]}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, { color: currentTheme.text }]}>{task.title}</Text>
            {task.category_id && <CategoryChip categoryId={task.category_id} small />}
          </View>
          
          {task.due_at && (
            <View style={styles.taskDetail}>
              <Feather name="calendar" size={14} color={currentTheme.textMuted} />
              <Text style={[styles.taskDetailText, { color: currentTheme.textMuted }]}>{formatDate(task.due_at)}</Text>
            </View>
          )}
          
          {task.reminder_at && (
            <View style={styles.taskDetail}>
              <Feather name="clock" size={14} color={currentTheme.textMuted} />
              <Text style={[styles.taskDetailText, { color: currentTheme.textMuted }]}>{formatDate(task.reminder_at)}</Text>
            </View>
          )}
          
          <View style={styles.taskActions}>
            {taskActionButtons.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.taskAction}
                onPress={action.onPress}
                testID={action.testID}
              >
                {action.icon && <Feather name={action.icon} size={16} color={colors.primary} />}
                <Text style={styles.taskActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      <Text style={[styles.timestamp, { color: message.is_user ? colors.white + '80' : currentTheme.textMuted }]}>
        {(() => {
          const date = new Date(message.created_at);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        })()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  message: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  taskCard: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  taskDetailText: {
    fontSize: 14,
  },
  taskActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  taskAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  taskActionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});