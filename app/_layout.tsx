import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import { AppStoreProvider, useAppStore } from '@/hooks/useAppStore';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading } = useAppStore();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTitleStyle: {
            color: '#FFFFFF',
          },
          headerTintColor: '#FFFFFF',
          contentStyle: {
            backgroundColor: '#000000',
          }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/[id]" options={{ title: "Task Details" }} />
        <Stack.Screen name="task/create" options={{ title: "Create Task" }} />
        <Stack.Screen name="task/edit/[id]" options={{ title: "Edit Task" }} />
        <Stack.Screen name="category/create" options={{ title: "Create Category" }} />
        <Stack.Screen name="category/edit/[id]" options={{ title: "Edit Category" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      console.log('Fetching session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Fetched session:', session);
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return null; // In a real app, you might show a splash screen or loading spinner
  }

  return !session ? <Auth /> : <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <AuthGate />
      </AppStoreProvider>
    </QueryClientProvider>
  );
}
