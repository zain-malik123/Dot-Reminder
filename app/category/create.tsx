import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  Alert
} from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

export default function CreateCategoryScreen() {
  const { addCategory, getCurrentTheme, user } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors.blue);
  
  const colorOptions = [
    colors.blue,
    colors.purple,
    colors.green,
    colors.orange,
    colors.red,
    colors.teal,
    colors.indigo,
    colors.pink,
  ];
  
  const handleCreateCategory = () => {
    if (!user) {
      console.error("Cannot create category: user is not loaded.");
      Alert.alert("Error", "Could not create category. Please try again later.");
      return;
    }

    if (!name.trim()) {
      // In a real app, we would show an error message
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    
    addCategory({
      name: name.trim(),
      color,
    });
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    router.back();
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>Category Name</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: currentTheme.card,
            color: currentTheme.text,
          }]}
          value={name}
          onChangeText={setName}
          placeholder="Enter category name"
          placeholderTextColor={currentTheme.textMuted}
          autoFocus
          testID="category-name-input"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>Color</Text>
        <View style={styles.colorGrid}>
          {colorOptions.map((colorOption) => (
            <TouchableOpacity
              key={colorOption}
              style={[
                styles.colorOption,
                { backgroundColor: colorOption },
                color === colorOption && [styles.selectedColorOption, { borderColor: currentTheme.text }]
              ]}
              onPress={() => setColor(colorOption)}
              testID={`color-${colorOption}`}
            />
          ))}
        </View>
      </View>
      
      <View style={styles.preview}>
        <Text style={[styles.previewLabel, { color: currentTheme.text }]}>Preview</Text>
        <View 
          style={[
            styles.previewChip,
            { backgroundColor: `${color}20` }
          ]}
        >
          <Text 
            style={[
              styles.previewChipText,
              { color }
            ]}
          >
            {name || 'Category Name'}
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <Button 
          title="Cancel" 
          onPress={handleCancel}
          variant="outline"
          style={{ flex: 1 }}
        />
        <Button 
          title="Create Category" 
          onPress={handleCreateCategory}
          variant="primary"
          style={{ flex: 2 }}
          testID="create-category-button"
          disabled={!user}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedColorOption: {
    borderWidth: 3,
  },
  preview: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  previewChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  previewChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});