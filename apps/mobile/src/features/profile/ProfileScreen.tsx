import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ONBOARDED_KEY } from '../../../app/_layout';
import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, Spacing } from '../../utils/theme';

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.profile(userId),
    [userId]
  );

  const handleContinue = useCallback(async () => {
    // Mark onboarding complete on the way through profile → measurements
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    router.push('/measurements');
  }, [router]);

  if (loading) {
    return (
      <Screen>
        <SectionCard>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Couldn't load profile"
          subtitle={error}
          action="Retry"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const fullName = data
    ? `${data.firstName} ${data.lastName}`.trim()
    : 'Demo User';

  return (
    <Screen>
      <SectionCard
        title="Your profile"
        subtitle="Foundational details that power fit and style recommendations."
      >
        <InfoRow label="Name"       value={fullName} />
        <InfoRow label="Height"     value={data?.heightCm ? `${data.heightCm} cm` : '—'} />
        <InfoRow label="Body shape" value={data?.bodyShape ?? '—'} />
        <InfoRow
          label="Palette"
          value={(data?.preferredColors ?? []).join(', ') || '—'}
          last
        />
      </SectionCard>

      <View style={styles.actions}>
        <PrimaryButton onPress={handleContinue}>
          Continue to measurements →
        </PrimaryButton>
        <PrimaryButton
          variant="secondary"
          onPress={() => {
            AsyncStorage.setItem(ONBOARDED_KEY, 'true');
            router.replace('/discover');
          }}
        >
          Skip to discover
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  actions: { gap: Spacing.sm },
});
