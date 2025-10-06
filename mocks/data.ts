import { ChatMessage } from '@/types';

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    user_id: '1',
    content: 'Hello! How can I help you today?',
    is_user: false,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    content: 'I need to create a task for buying groceries',
    is_user: true,
    created_at: new Date(Date.now() - 86300000).toISOString(),
    updated_at: new Date(Date.now() - 86300000).toISOString(),
  },
  {
    id: '3',
    user_id: '1',
    content: 'I\'ve created a task "Buy groceries" in your Shopping list. Would you like to add any details or a due date?',
    is_user: false,
    created_at: new Date(Date.now() - 86200000).toISOString(),
    updated_at: new Date(Date.now() - 86200000).toISOString(),
    task_action: {
      type: 'create',
      task_id: '2',
    },
  },
  {
    id: '4',
    user_id: '1',
    content: 'I\'ve completed the grocery shopping',
    is_user: true,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '5',
    user_id: '1',
    content: 'Great! I\'ve marked "Buy groceries" as complete.',
    is_user: false,
    created_at: new Date(Date.now() - 3500000).toISOString(),
    updated_at: new Date(Date.now() - 3500000).toISOString(),
    task_action: {
      type: 'update',
      task_id: '2',
    },
  },
];