import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/hooks/useAppStore';

type CategoryChipProps = {
  categoryId: string;
  small?: boolean;
};

export const CategoryChip: React.FC<CategoryChipProps> = ({ categoryId, small = false }) => {
  const { categories } = useAppStore();
  const category = categories.find((cat) => cat.id === categoryId);
  
  if (!category) return null;
  
  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: `${category.color}40` }, // 40 is for 25% opacity
        small && styles.small
      ]}
      testID="category-chip"
    >
      <Text 
        style={[
          styles.text, 
          { color: category.color },
          small && styles.smallText
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  smallText: {
    fontSize: 12,
  },
});