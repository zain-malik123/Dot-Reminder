import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/hooks/useAppStore';

type ChatInputProps = {
  onSend: (message: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
};

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  onStartRecording, 
  onStopRecording,
  isRecording
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { getCurrentTheme } = useAppStore();
  const currentTheme = getCurrentTheme();
  
  const handleSend = () => {
    if (message.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSend(message.trim());
      setMessage('');
      Keyboard.dismiss();
    }
  };
  
  const handleMicPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
      style={styles.keyboardAvoidingView}
    >
      <View style={[styles.container, { backgroundColor: currentTheme.card }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: currentTheme.text }]}
          placeholder="Type a message..."
          placeholderTextColor={currentTheme.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isRecording}
          testID="chat-input"
        />
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              isRecording && styles.recordingButton
            ]}
            onPress={handleMicPress}
            testID="mic-button"
          >
            <Feather 
              name={isRecording ? 'mic' : 'mic'}
              size={20} 
              color={isRecording ? colors.white : currentTheme.textMuted} 
            />
          </TouchableOpacity>
          
          {message.trim() ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleSend}
              testID="send-button"
            >
              <Feather name="send" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  recordingButton: {
    backgroundColor: colors.error,
  },
});