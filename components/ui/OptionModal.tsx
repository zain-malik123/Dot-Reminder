import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface Option {
  value: string;
  label: string;
}

interface OptionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: Option[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const OptionModal: React.FC<OptionModalProps> = ({
  visible,
  onClose,
  title,
  description,
  options,
  selectedValue,
  onSelect,
}) => {
  const { getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{title}</Text>
          {description && (
            <Text style={[styles.modalDescription, { color: currentTheme.textMuted }]}>{description}</Text>
          )}
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.modalOption, selectedValue === option.value && { backgroundColor: colors.primary + '20' }]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[styles.modalOptionText, { color: currentTheme.text }, selectedValue === option.value && { color: colors.primary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: currentTheme.card }]} onPress={onClose}>
            <Text style={[styles.modalCloseText, { color: currentTheme.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  modalDescription: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalOption: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8 },
  modalOptionText: { fontSize: 16, fontWeight: '500' },
  modalCloseButton: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '600' },
});