import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ONBOARDED_KEY } from '../../../app/_layout';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { analytics } from '../../services/analytics';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';

export function OnboardingScreen() {
  const router = useRouter();

  const handleStart = useCallback(async () => {
    analytics.track('onboarding_completed', {
      sourceScreen: 'onboarding',
      completionPath: 'profile_setup',
    }).catch(() => {});
    router.push('/profile');
  }, [router]);

  const handleSkip = useCallback(async () => {
    // Mark as onboarded so we never show this again
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    analytics.track('onboarding_completed', {
      sourceScreen: 'onboarding',
      completionPath: 'skipped',
    }).catch(() => {});
    router.replace('/discover');
  }, [router]);

  const features = [
    { icon: '📷', title: 'Snap & try on',     desc: 'Take a photo in-store and instantly see how an outfit looks on you.' },
    { icon: '📏', title: 'Perfect fit',        desc: 'Save your measurements for size recommendations tailored to your body.' },
    { icon: '✨', title: 'AI styling',          desc: 'Personalised outfit recommendations based on your style and body shape.' },
    { icon: '🛍️', title: 'Shop discovery',     desc: 'Find where to buy the looks you love, across all your favourite stores.' },
  ];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logoText}>FitMe</Text>
        <Text style={styles.tagline}>Your AI personal stylist</Text>
      </View>

      <View style={styles.featureList}>
        {features.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={handleStart}>Set up my profile →</PrimaryButton>
        <PrimaryButton variant="ghost" onPress={handleSkip}>
          Skip for now
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl },
  logoText: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  featureList: { gap: Spacing.md },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon:  { fontSize: 26, marginTop: 2 },
  featureText:  { flex: 1, gap: 2 },
  featureTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  featureDesc:  { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  actions:      { gap: Spacing.sm, marginTop: Spacing.md },
});
