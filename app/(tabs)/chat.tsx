import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, Platform, Keyboard, Alert, Text } from 'react-native';
import { useAppStore } from '@/hooks/useAppStore';
import { ChatMessage as ChatMessageComponent } from '@/components/ui/ChatMessage';
import { ChatInput } from '@/components/ui/ChatInput';
import { router } from 'expo-router';
import { ChatMessage, Task } from '@/types';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { TypingIndicator } from '@/components/ui/TypingIndicator';

export default function ChatScreen() {
  // Removed transcribeAudio as we'll handle it locally
  const { chatMessages, sendChatMessageToAI, getCurrentTheme, isAiTyping } = useAppStore();
  const currentTheme = getCurrentTheme();
  const [isRecording, setIsRecording] = useState(false);
  const wasRecording = useRef(false);
  const [recognizedText, setRecognizedText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  // Speech recognition event listeners
  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("end", () => setIsRecording(false));
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results && event.results.length > 0) {
      setRecognizedText(event.results[0]?.transcript || '');
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("Speech recognition error:", event.error, "message:", event.message);
    setIsRecording(false);
    Alert.alert('Speech Recognition Error', event.message);
  });
  
  // Auto-scroll to end when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardWillShowListener = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        })
      : null;
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardWillShowListener?.remove();
    };
  }, []);
  
  // Auto-scroll when new messages are added
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  // Effect to send the message when recording stops
  useEffect(() => {
    // Check if recording just stopped (was true, is now false) and we have a transcript
    if (wasRecording.current && !isRecording && recognizedText.trim()) {
      handleSendMessage(recognizedText.trim());
      setRecognizedText(''); // Reset for the next recording
    }
    // Update the previous recording state
    wasRecording.current = isRecording;
  }, [isRecording, recognizedText]);


  const handleSendMessage = (text: string) => {
    sendChatMessageToAI(text);
  };
  
  const handleTaskAction = (action: string, task: Task) => {
    switch (action) {
      case 'open':
        router.push(`/task/${task.id}`);
        break;
      case 'edit':
        router.push(`/task/edit/${task.id}`);
        break;
      case 'complete':
        // This is handled by the completeTask function in the ChatMessage component
        break;
      case 'snooze':
        // In a real app, we would show a snooze dialog
        // For now, we'll just log it
        console.log('Snooze task:', task.id);
        break;
      default:
        break;
    }
  };
  
  const handleStartRecording = async () => {
    setRecognizedText('');
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permissions Required', 'Please grant microphone and speech recognition permissions.');
        return;
      }
      
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      Alert.alert('Error', 'Could not start voice recognition. Please check your permissions.');
    }
  };
  
  const handleStopRecording = async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessageComponent 
            message={item} 
            onTaskAction={handleTaskAction}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
        onLayout={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        testID="chat-messages"
      />

      {isAiTyping && <TypingIndicator />}
      
      <ChatInput 
        onSend={handleSendMessage}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        isRecording={isRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 80,
  },
});