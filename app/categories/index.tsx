import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/hooks/useAppStore';
import { colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import { Category } from '@/types';

type EditingCategory = {
  id: string;
  name: string;
  color: string;
};

const PRESET_COLORS = [
  colors.blue,
  colors.purple,
  colors.green,
  colors.orange,
  colors.red,
  colors.pink,
  colors.teal,
  colors.indigo,
];

export default function CategoriesScreen() {
  const { categories, updateCategory, deleteCategory, getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);

  const handleEditCategory = (category: Category) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      color: category.color,
    });
  };

  const handleSaveEdit = () => {
    if (editingCategory && editingCategory.name.trim()) {
      updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        color: editingCategory.color,
      });
      setEditingCategory(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleDeleteCategory = (category: Category) => {
    deleteCategory(category.id);
  };

  const handleAddCategory = () => {
    router.push('/category/create');
  };

  const renderCategoryItem = ({ item: category }: { item: Category }) => {
    const isEditing = editingCategory?.id === category.id;

    if (isEditing) {
      return (
        <View style={[styles.categoryItem, { backgroundColor: currentTheme.card }]}>
          <View style={styles.editingContainer}>
            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.border,
                },
              ]}
              value={editingCategory.name}
              onChangeText={(text) =>
                setEditingCategory({ ...editingCategory, name: text })
              }
              placeholder="Category name"
              placeholderTextColor={currentTheme.textMuted}
              autoFocus
            />
            
            <View style={styles.colorPicker}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    editingCategory.color === color && styles.selectedColor,
                  ]}
                  onPress={() =>
                    setEditingCategory({ ...editingCategory, color })
                  }
                />
              ))}
            </View>
            
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Feather name="x" size={16} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Feather name="check" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.categoryItem, { backgroundColor: currentTheme.card }]}>
        <View style={styles.categoryInfo}>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: category.color },
            ]}
          />
          <Text style={[styles.categoryName, { color: currentTheme.text }]}>
            {category.name}
          </Text>
        </View>
        
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditCategory(category)}
            testID={`edit-category-${category.id}`}
          >
            <Feather name="edit" size={16} color={currentTheme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteCategory(category)}
            testID={`delete-category-${category.id}`}
          >
            <Feather name="trash-2" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <Stack.Screen
        options={{
          title: 'Manage Categories',
          headerStyle: { backgroundColor: currentTheme.background },
          headerTintColor: currentTheme.text,
          headerTitleStyle: { color: currentTheme.text },
        }}
      />
      
      <View style={styles.content}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
                No categories yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: currentTheme.textMuted }]}>
                Create your first category to organize your tasks
              </Text>
            </View>
          )}
        />
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddCategory}
          testID="add-category-button"
        >
          <Feather name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  categoryItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editingContainer: {
    gap: 16,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
});