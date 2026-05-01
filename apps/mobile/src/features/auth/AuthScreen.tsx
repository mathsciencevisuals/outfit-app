import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ONBOARDED_KEY } from '../../../app/_layout';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

type AuthMode = 'login' | 'signup';

export function AuthScreen() {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('Demo');
  const [lastName, setLastName] = useState('User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    let navigated = false;

    try {
      const response =
        mode === 'login'
          ? await mobileApi.login(email.trim().toLowerCase(), password)
          : await mobileApi.register({
              email: email.trim().toLowerCase(),
              password,
              firstName: firstName.trim() || 'Demo',
              lastName: lastName.trim() || 'User',
            });

      setSession({
        userId: response.user.id,
        accessToken: response.accessToken,
        userRole: response.user.role,
        authEmail: email.trim().toLowerCase(),
        authPassword: password,
      });

      if (mode === 'signup') {
        await AsyncStorage.removeItem(ONBOARDED_KEY);
        navigated = true;
        router.replace('/onboarding');
        return;
      }

      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      navigated = true;
      router.replace(onboarded ? '/dashboard' : '/onboarding');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      if (!navigated) {
        setLoading(false);
      }
    }
  };

  const useDemo = async () => {
    setLoading(true);
    setError(null);
    let navigated = false;

    try {
      const user = await mobileApi.ensureDemoSession();
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      navigated = true;
      router.replace(onboarded ? '/dashboard' : '/onboarding');
      if (!user) {
        throw new Error('Demo session could not be created.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Demo login failed.');
    } finally {
      if (!navigated) {
        setLoading(false);
      }
    }
  };

  const canSubmit =
    !!email.trim() &&
    password.trim().length >= 8 &&
    (mode === 'login' || (!!firstName.trim() && !!lastName.trim()));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>FitMe</Text>
        <Text style={styles.tagline}>Sign in first, then continue to your profile and fit journey.</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('login')}
          style={[styles.modeChip, mode === 'login' && styles.modeChipActive]}
        >
          <Text style={[styles.modeChipText, mode === 'login' && styles.modeChipTextActive]}>Log in</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('signup')}
          style={[styles.modeChip, mode === 'signup' && styles.modeChipActive]}
        >
          <Text style={[styles.modeChipText, mode === 'signup' && styles.modeChipTextActive]}>Sign up</Text>
        </Pressable>
      </View>

      <SectionCard
        title={mode === 'login' ? 'Welcome back' : 'Create your account'}
        subtitle={mode === 'login' ? 'Use your existing FitMe account.' : 'Start with an account, then complete onboarding.'}
      >
        {mode === 'signup' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              placeholder="First name"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
        ) : null}

        {mode === 'signup' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              placeholder="Last name"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Minimum 8 characters"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton onPress={submit} loading={loading} disabled={!canSubmit}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </PrimaryButton>
      </SectionCard>

      <SectionCard
        title="Quick access"
        subtitle="Use a throwaway demo account if you only want to test the app."
      >
        <PrimaryButton variant="secondary" onPress={useDemo} loading={loading}>
          Continue with demo account
        </PrimaryButton>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  brand: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeChip: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  modeChipTextActive: {
    color: Colors.white,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface2,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
});
