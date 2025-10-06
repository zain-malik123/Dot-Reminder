import createContextHook from '@nkzw/create-context-hook';
import { Category, ChatMessage, Subscription, Task, User, UserSchedule, UserSettings } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { theme } from '@/constants/colors';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';

// --- N8n Integration ---
const N8N_BASE_URL = 'https://n8n.srv917840.hstgr.cloud/webhook'; // TODO: Replace with actual n8n webhook base URL

async function makeN8nRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any,
  userId?: string // Pass user ID for RLS
): Promise<T> {
  let url = `${N8N_BASE_URL}/${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'GET') {
    const queryParams = new URLSearchParams(data);
    if (userId) queryParams.append('user_id', userId);
    url = url.concat(`?${queryParams.toString()}`);
  } else {
    const body = { ...data };
    if (userId) {
      body.user_id = userId;
    }
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `N8n request failed: ${response.statusText}`);
    }
    // Handle cases where the response is successful but has no body
    const responseText = await response.text();
    if (!responseText) {
      return null as T;
    }
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`Error making N8n request to ${path}:`, error);
    throw error;
  }
}
// --- End N8n Integration ---

// --- Notification Handler ---
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // On Android, shouldShowAlert is the only property that controls if the notification is presented.
    // On iOS, shouldShowAlert is deprecated in favor of shouldShowBanner and shouldShowList.
    const behavior = {
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: Platform.OS === 'android', // Only for Android
      shouldShowBanner: Platform.OS === 'ios', // For iOS banner
      shouldShowList: Platform.OS === 'ios', // For iOS notification center
    };
    return behavior;
  },
});

// Keys for AsyncStorage
const STORAGE_KEYS = {
  USER: 'dot_user',
  USER_SETTINGS: 'dot_user_settings',
  USER_SCHEDULE: 'dot_user_schedule',
  SUBSCRIPTION: 'dot_subscription',
  CATEGORIES: 'dot_categories',
  TASKS: 'dot_tasks',
  CHAT_MESSAGES: 'dot_chat_messages',
};

// Helper function to schedule a notification for a task
const scheduleNotificationForTask = async (task: Task) => {
  if (!task.reminder_at) {
    console.log(`Task "${task.title}" has no reminder, skipping notification.`);
    return;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'You need to enable notifications to receive task reminders.');
    return;
  }

  const trigger = new Date(task.reminder_at);

  // Ensure the notification is scheduled for a future date
  if (trigger.getTime() <= Date.now()) {
    console.log(`Reminder for task "${task.title}" is in the past, not scheduling.`);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: { title: `Reminder: ${task.title}`, body: task.description || 'Don\'t forget about this task!' },
    trigger: { date: trigger },
  });
};

const handleAuthError = () => {
  console.error("Authentication error, signing out.");
  supabase.auth.signOut();
  throw new Error('User not authenticated.');
};

export const [AppStoreProvider, useAppStore] = createContextHook(() => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userSchedule, setUserSchedule] = useState<UserSchedule | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // New state for manual refresh

  // Listen to authentication changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`, session);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // We don't set the user object directly from the session here.
        // Instead, we trigger a reload of data, which will fetch the full user profile.
        // A simple way to do this is to set a temporary user object to trigger the other useEffect.
        if (session?.user) {
          setUser({ id: session.user.id } as User); // Minimal user to trigger data load
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Function to manually trigger a data refresh
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Load all user data when the user object changes (login/logout)
  useEffect(() => {
    const loadData = async () => {
      // Only set global loading on the very first load.
      // For subsequent refreshes, we'll use a different state.
      if (isLoading) {
        setIsRefreshing(false);
      } else {
        setIsRefreshing(true);
      }
      const currentUserId = user?.id;

      if (!currentUserId) {
        setUser(null);
        setUserSettings(null);
        setUserSchedule(null);
        setSubscription(null);
        setCategories([]);
        setTasks([]);
        setChatMessages([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Fetch data in parallel
      const [userResponse, userSettingsResponse, userScheduleResponse, subscriptionResponse, categoriesResponse, tasksResponse, chatMessagesResponse] = await Promise.allSettled([
        makeN8nRequest<User[]>('user/fetch', 'POST', { id: currentUserId }, currentUserId),
        makeN8nRequest<UserSettings[]>('user/settings/fetch', 'POST', { id: currentUserId }, currentUserId),
        makeN8nRequest<UserSchedule[]>('user/schedule/fetch', 'POST', { user_id: currentUserId }, currentUserId),
        makeN8nRequest<Subscription[]>('subscription/fetch', 'POST', { user_id: currentUserId }, currentUserId),
        makeN8nRequest<Category[]>('category/fetch', 'POST', { user_id: currentUserId }, currentUserId),
        makeN8nRequest<Task[]>('task/fetch', 'POST', { user_id: currentUserId }, currentUserId),
        makeN8nRequest<ChatMessage[]>('chat/fetch', 'POST', { user_id: currentUserId }, currentUserId),
      ]);

      // Process responses
      if (userResponse.status === 'fulfilled' && userResponse.value && userResponse.value[0]) {
        const userProfile = userResponse.value[0];
        // Combine profile from DB with email from auth session
        const combinedUser: User = {
          ...userProfile, // This now contains the full profile from the DB
          email: (await supabase.auth.getSession()).data.session?.user.email || '', // Get fresh email
        };
        setUser(combinedUser);
      } else {
        setUser(null);
      }

      if (userSettingsResponse.status === 'fulfilled' && userSettingsResponse.value && userSettingsResponse.value.length > 0) {
        setUserSettings(userSettingsResponse.value[0]);
      } else {
        // If no settings are found, it's an unexpected state since the trigger should have created them.
        console.error('User settings not found. This may indicate an issue with the database trigger.');
        setUserSettings(null);
      }

      if (userScheduleResponse.status === 'fulfilled' && userScheduleResponse.value && userScheduleResponse.value.length > 0) {
        setUserSchedule(userScheduleResponse.value[0]);
      } else {
        setUserSchedule(null);
      }

      if (subscriptionResponse.status === 'fulfilled' && subscriptionResponse.value && subscriptionResponse.value[0]) {
        setSubscription(subscriptionResponse.value[0]);
      } else {
        setSubscription(null);
      }
      setCategories(categoriesResponse.status === 'fulfilled' && categoriesResponse.value ? categoriesResponse.value : []);
      setTasks(tasksResponse.status === 'fulfilled' && tasksResponse.value ? tasksResponse.value : []);
      setChatMessages(chatMessagesResponse.status === 'fulfilled' && chatMessagesResponse.value ? chatMessagesResponse.value : []);

      setIsLoading(false);
      setIsRefreshing(false);
    };
    
    loadData();

    // Set up a real-time listener for subscription changes
    const setupSubscriptionListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (currentUserId) {
        const channel = supabase.channel(`subscriptions:${currentUserId}`)
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'subscriptions', 
              filter: `user_id=eq.${currentUserId}` 
            }, 
            (payload) => {
              console.log('Real-time subscription change received!', payload);
              if (payload.new) {
                setSubscription(payload.new as Subscription);
              }
            }
          ).subscribe();
      }
    };

    setupSubscriptionListener();
  }, [user?.id, refreshTrigger]); // Added refreshTrigger to dependencies

  // Task operations
  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      const response = await makeN8nRequest<Task[]>('task/create', 'POST', task, currentUserId);
      const createdTask = response ? response[0] : null;
      if (!createdTask) throw new Error("Task creation did not return a valid task.");

      setTasks((prevTasks) => [...prevTasks, createdTask!]);

      // Schedule a local notification for the new task
      await scheduleNotificationForTask(createdTask);

      return createdTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      const response = await makeN8nRequest<Task[]>('task/update', 'POST', { task_id: taskId, ...updates }, currentUserId);
      const updatedTask = response ? response[0] : null;
      if (!updatedTask) throw new Error("Task update did not return a valid task.");

      setTasks((prevTasks) => 
        prevTasks.map((task) => 
          task.id === taskId 
            ? updatedTask!
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      await makeN8nRequest<void>('task/delete', 'POST', { task_id: taskId }, currentUserId);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const completeTask = async (taskId: string, completed: boolean = true) => {
    const completed_at = completed ? new Date().toISOString() : null;
    const originalTasks = tasks;
    
    // Optimistic UI update
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, completed_at, updated_at: new Date().toISOString() } : task
    ));
    
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      // Call the dedicated complete endpoint
      await makeN8nRequest('task/complete', 'POST', { task_id: taskId, completed_at }, currentUserId);
    } catch (error) {
      console.error("Failed to persist task completion, reverting:", error);
      // Revert on error
      setTasks(originalTasks);
    }
  };

  // Category operations
  const addCategory = async (category: Omit<Category, 'id' | 'user_id' | 'position'>) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      const response = await makeN8nRequest<Category[]>('category/create', 'POST', { ...category, user_id: currentUserId }, currentUserId);
      const createdCategory = response ? response[0] : null;
      if (!createdCategory) throw new Error("Category creation did not return a valid category.");

      setCategories((prevCategories) => [...prevCategories, createdCategory!]);
      return createdCategory;
    } catch (error) {
      console.error('Error adding category:', error.message);
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      const updatedCategoryResponse = await makeN8nRequest<Category[]>('category/update', 'POST', { cat_id: categoryId, ...updates }, currentUserId);
      if (updatedCategoryResponse && updatedCategoryResponse.length > 0) {
        const updatedCategory = updatedCategoryResponse[0];
        setCategories((prevCategories) =>
          prevCategories.map((category) =>
            category.id === categoryId ? updatedCategory : category
          )
        );
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      console.log('--- Deleting category with id:', categoryId);
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      await makeN8nRequest<void>('category/delete', 'POST', { cat_id: categoryId });
      console.log('--- Category deleted from backend, updating local state');
      setCategories((prevCategories) => 
        prevCategories.filter((category) => category.id !== categoryId)
      );
      
      // Update tasks that were in this category to have no category
      setTasks((prevTasks) => 
        prevTasks.map((task) => 
          task.category_id === categoryId 
            ? { ...task, category_id: '' } 
            : task
        )
      );
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Chat operations
  const addChatMessage = async (message: Omit<ChatMessage, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const currentUserId = user?.id;
      // For now, we will add the message locally without calling the backend.
      // This avoids the API call as requested.
      const newMessage: ChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Create a unique temporary local ID
        user_id: currentUserId || 'local-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Add the missing updated_at property
        ...message,
      };

      setChatMessages((prevMessages) => [...prevMessages, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw error;
    }
  };

  const sendChatMessageToAI = async (messageText: string) => {
    const currentUserId = user?.id;
    if (!currentUserId) return handleAuthError();

    // Add the user's message to the chat optimistically
    addChatMessage({
      content: messageText,
      is_user: true,
    });

    setIsAiTyping(true);
    try {
      const response = await makeN8nRequest<{ output: string }[]>('ai/do_task', 'POST', { chatInput: messageText }, currentUserId);

      if (response && response[0] && response[0].output) {
        // Add the AI's response to the chat
        await addChatMessage({
          content: response[0].output,
          is_user: false,
        });
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      await addChatMessage({ content: 'Sorry, I had trouble connecting. Please try again.', is_user: false });
    } finally {
      setIsAiTyping(false);
    }
  };
  // User settings operations
  const updateUserSettings = async (updates: Partial<UserSettings>) => { // This function was already modified in previous turns
    const originalSettings = userSettings; // This function was already modified in previous turns
    if (originalSettings) { // This function was already modified in previous turns
      // Optimistic UI update // This function was already modified in previous turns
      setUserSettings({ ...originalSettings, ...updates }); // This function was already modified in previous turns

      try { // This function was already modified in previous turns
        const currentUserId = user?.id; // This function was already modified in previous turns
        if (!currentUserId) return handleAuthError(); // This function was already modified in previous turns
        
        // Map frontend keys to backend keys
        const apiUpdates: { [key: string]: any } = {};
        if (updates.theme !== undefined) apiUpdates.theme = updates.theme;
        if (updates.language !== undefined) apiUpdates.lang = updates.language;
        if (updates.notifications_enabled !== undefined) apiUpdates.notification = updates.notifications_enabled;

        // Call the backend to persist changes // This function was already modified in previous turns
        // NOTE: You will need to create a 'user/settings/update' webhook in n8n // This function was already modified in previous turns
        const response = await makeN8nRequest<UserSettings[]>('user/settings/update', 'POST', apiUpdates, currentUserId);

        // After successful update, set the state with the confirmed data from the backend
        if (response && response.length > 0) {
          setUserSettings(response[0]);
        }

      } catch (error) { // This function was already modified in previous turns
        console.error("Failed to persist user settings, reverting:", error); // This function was already modified in previous turns
        setUserSettings(originalSettings); // Revert on error // This function was already modified in previous turns
        // Re-throw the error so the calling component can be aware of it if needed
        throw error;
      } // This function was already modified in previous turns
    } // This function was already modified in previous turns
  }; // This function was already modified in previous turns

  // User profile operations
  const updateUser = async (userId: string, updates: { name?: string; image?: string | null }) => {
    const originalUser = user;
    if (!originalUser) {
      handleAuthError();
      throw new Error('User not authenticated.');
    }

    // Optimistic UI update
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedFields: Partial<User> = {};
      if (updates.name !== undefined) updatedFields.full_name = updates.name;
      // Only optimistically update avatar if it's a URL, not a large base64 string
      if (updates.image && !updates.image.startsWith('data:image')) {
        updatedFields.avatar_url = updates.image;
      }
      return { ...prevUser, ...updatedFields };
    });

    try {
      // The n8n webhook will process the update and return the full, updated user object.
      const response = await makeN8nRequest<User[]>('user/update', 'POST', { ...updates }, userId);
      const updatedUser = response?.[0];

      // Merge the updated user data with the existing user data to preserve fields like email
      if (updatedUser) {
        setUser((prevUser) => {
          return prevUser ? { ...prevUser, ...updatedUser } : updatedUser;
        });
      }
    } catch (error) {
      console.error('Error in updateUser store function:', error);
      setUser(originalUser); // Revert on error
      throw error;
    }
  };

  // User schedule operations
  const updateUserSchedule = async (updates: Partial<UserSchedule>) => {
    const originalSchedule = userSchedule;
    if (originalSchedule) {
      setUserSchedule({ ...originalSchedule, ...updates });
      try {
        const currentUserId = user?.id;
        if (!currentUserId) return handleAuthError();
        const response = await makeN8nRequest<UserSchedule[]>('user/schedule/update', 'POST', updates, currentUserId);
        if (response && response.length > 0) {
          setUserSchedule(response[0]);
        }
      } catch (error) {
        console.error("Failed to persist user schedule, reverting:", error);
        setUserSchedule(originalSchedule);
        throw error;
      }
    }
  };

  // Subscription operations
  const createCheckoutSession = async (plan: 'monthly' | 'yearly') => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return handleAuthError();
      if (!user?.email) throw new Error("User email is not available.");

      // Call n8n to create a Stripe checkout session
      // n8n will need to be configured with Stripe price IDs for 'monthly' and 'yearly'
      const response = await makeN8nRequest<{ checkoutUrl: string }>('subscription/create', 'POST', { 
        plan: plan, 
        email: user.email, 
        user_id: currentUserId,
        platform: Platform.OS // Add the platform here
      });

      if (response && response.checkoutUrl) {
        // Open the Stripe checkout page in an in-app browser
        await WebBrowser.openBrowserAsync(response.checkoutUrl);
      } else {
        throw new Error('Could not retrieve checkout URL.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  };

  // Get current theme
  const getCurrentTheme = () => {
    return userSettings?.theme === 'light' ? theme.light : theme.dark;
  };

  // Get tasks by category
  const getTasksByCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      return tasks;
    }
    return tasks.filter((task) => task.category_id === categoryId);
  };

  // Get tasks by date
  const getTasksByDate = (date: string) => {
    const dateOnly = date.split('T')[0];
    return tasks.filter((task) => {
      if (!task.due_at) return false;
      return task.due_at.split('T')[0] === dateOnly;
    });
  };

  // Get completed tasks
  const getCompletedTasks = () => {
    return tasks.filter((task) => task.completed_at);
  };

  // Get incomplete tasks
  const getIncompleteTasks = () => {
    return tasks.filter((task) => !task.completed_at);
  };

  return {
    // State
    user,
    userSettings,
    userSchedule,
    subscription,
    categories,
    tasks,
    chatMessages,
    isLoading,
    isRefreshing,
    isAiTyping,
    triggerRefresh, // Expose the refresh function
    
    // Task operations
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    
    // Category operations
    addCategory,
    updateCategory,
    deleteCategory,
    
    // Chat operations
    addChatMessage,
    sendChatMessageToAI,
    
    // User settings operations
    updateUserSettings,
    
    // User profile operations
    updateUser,
    
    // User schedule operations
    updateUserSchedule,

    // Subscription operations
    createCheckoutSession,
    
    // Getters
    getCurrentTheme,
    getTasksByCategory,
    getTasksByDate,
    getCompletedTasks,
    getIncompleteTasks,
  };
});

// Create a hook to get tasks filtered by category
export const useTasksByCategory = (categoryId: string | null) => {
  const { tasks } = useAppStore();
  
  return tasks.filter((task) => {
    if (categoryId === null) return true;
    return task.category_id === categoryId;
  });
};

// Create a hook to get tasks for a specific date
export const useTasksByDate = (date: string) => {
  const { tasks } = useAppStore();
  const selectedDate = new Date(date);
  
  return tasks.filter((task) => {
    if (!task.due_at) return false;
    
    const taskDueDate = new Date(task.due_at);
    
    // Compare year, month, and day in the local timezone
    return taskDueDate.getFullYear() === selectedDate.getFullYear() &&
           taskDueDate.getMonth() === selectedDate.getMonth() &&
           taskDueDate.getDate() === selectedDate.getDate();
  });
};