import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAppStore } from "@/hooks/useAppStore";
import { colors } from "@/constants/colors";

export default function TabLayout() {
  // Also get userSettings to ensure this component re-renders when settings change.
  const { getCurrentTheme, userSettings, isLoading } = useAppStore();
  const currentTheme = getCurrentTheme();

  // Display a global loading indicator until the initial data is fetched
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: currentTheme.text,
        tabBarInactiveTintColor: currentTheme.textMuted,
        tabBarStyle: {
          backgroundColor: currentTheme.tabBar,
          borderTopColor: currentTheme.border,
        },
        headerStyle: {
          backgroundColor: currentTheme.background,
        },
        headerTitleStyle: {
          color: currentTheme.text,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => <Feather name="check-square" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <Feather name="message-circle" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <Feather name="calendar" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}