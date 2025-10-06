import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kgmvjehuppdjfarmfksm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbXZqZWh1cHBkamZhcm1ma3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzYzMjQsImV4cCI6MjA3MTExMjMyNH0.tw6PiCndjquJRauMxbDhawsO6MRnG6X_0cjxw6MFjiQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});