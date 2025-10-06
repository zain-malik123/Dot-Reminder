import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';

// A simple cross-platform alert
function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingSignUp, setLoadingSignUp] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');

  async function handleAuthAction(action: 'signIn' | 'signUp' | 'magicLink') {
    if (action === 'signIn') setLoadingSignIn(true);
    if (action === 'signUp') setLoadingSignUp(true);
    if (action === 'magicLink') setLoadingMagic(true);
    try {
      let error = null;
      switch (action) {
        case 'signIn':
          ({ error } = await supabase.auth.signInWithPassword({ email, password }));
          if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.factors && user.factors.length > 0) {
              // User has 2FA enabled, prompt for code
              const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: user.factors[0].id });
              if (challengeError) {
                showAlert('Error', challengeError.message);
              } else {
                setMfaChallengeId(data.id);
                setFactorId(user.factors[0].id);
                setShow2FAVerification(true);
              }
            } else {
              // No 2FA enabled, sign in directly
              showAlert('Success!', 'You are now signed in.');
            }
          }
          break;
        case 'signUp':
          const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
          error = signUpError;
          if (!error && data.user) {
            showAlert('Success!', 'Please check your inbox for email verification.');
            
          }
          break;
        case 'magicLink':
          ({ error } = await supabase.auth.signInWithOtp({ email }));
          if (!error) showAlert('Check your email!', 'A magic link has been sent.');
          break;
      }

      if (error) {
        showAlert('Error', error.message);
      }
    } catch (e: any) {
      showAlert('An unexpected error occurred', e.message);
    } finally {
      setLoadingSignIn(false);
      setLoadingSignUp(false);
      setLoadingMagic(false);
    }
  }

  async function handle2FAVerification() {
    setLoadingMagic(true); // Reusing loadingMagic for 2FA operations
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        code: mfaCode,
        challengeId: mfaChallengeId,
      });
      if (error) {
        showAlert('Error', error.message);
      }
      else {
        showAlert('Success!', 'You are now signed in with 2FA.');
        setShow2FAVerification(false);
        setMfaCode('');
      }
    } catch (e: any) {
      showAlert('An unexpected error occurred during 2FA verification', e.message);
    } finally {
      setLoadingMagic(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>D0t Reminds</Text>
      <Text style={styles.description}>
        Sign in or create an account
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          keyboardType="email-address"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
          placeholderTextColor="#888"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loadingSignIn && styles.buttonDisabled]}
        onPress={() => handleAuthAction('signIn')}
        disabled={loadingSignIn || loadingSignUp || loadingMagic}
      >
        <Text style={styles.buttonText}>
          {loadingSignIn ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.signUpButton, loadingSignUp && styles.buttonDisabled]}
        onPress={() => handleAuthAction('signUp')}
        disabled={loadingSignIn || loadingSignUp || loadingMagic}
      >
        <Text style={styles.buttonText}>
          {loadingSignUp ? 'Signing up...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.magicLinkButton}
        onPress={() => handleAuthAction('magicLink')}
        disabled={loadingSignIn || loadingSignUp || loadingMagic}
      >
        <Text style={styles.magicLinkText}>
          {loadingMagic ? 'Sending magic link...' : 'Sign in with Magic Link'}
        </Text>
      </TouchableOpacity>

      {show2FAVerification && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            onChangeText={setMfaCode}
            value={mfaCode}
            placeholder="2FA Code"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={[styles.button, loadingMagic && styles.buttonDisabled]}
            onPress={handle2FAVerification}
            disabled={loadingMagic}
          >
            <Text style={styles.buttonText}>
              {loadingMagic ? 'Verifying...' : 'Verify 2FA'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '60%',
    maxWidth: 300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    width: '60%',
    maxWidth: 300,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#333',
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  magicLinkButton: {
    marginTop: 16,
  },
  magicLinkText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 16,
    alignSelf: 'center',
  },
});