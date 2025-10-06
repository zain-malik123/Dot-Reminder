export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category_id: string;
  due_at?: string;
  repeat_rule?: string;
  reminder_at?: string;
  location_reminder?: string;
  location_geofence?: {
    name: string;
    lat: number;
    lng: number;
    radius: number;
    trigger: 'enter' | 'exit';
  };
  duration_days?: number;
  completed_at?: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  locale: 'en' | 'ar';
};

export type UserSettings = {
  user_id: string;
  theme: 'dark' | 'light';
  language: 'en' | 'ar';
  notifications_enabled: boolean;
  location_enabled: boolean;
};

export type Subscription = {
  user_id: string;
  status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';
  plan: 'free' | 'monthly' | 'yearly';
  period_end?: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  is_user: boolean;
  created_at: string;
  task_action?: {
    type: 'create' | 'update' | 'delete';
    task_id?: string;
    task?: Task;
  };
};