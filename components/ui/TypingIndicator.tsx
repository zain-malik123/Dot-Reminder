import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAppStore } from '@/hooks/useAppStore';

export const TypingIndicator = () => {
  const { getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();

  // This is a simplified "typing" animation using dots.
  // In a real app, you might use a library like `react-native-indicators`.
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.messageBubble, { backgroundColor: currentTheme.card }]}>
        <Text style={[styles.text, { color: currentTheme.text }]}>
          Typing{dots}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});