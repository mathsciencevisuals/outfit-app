import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '../src/components/Screen';
import { SectionCard } from '../src/components/SectionCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ONBOARDED_KEY } from './_layout';
import { Colors, FontSize, FontWeight, Spacing } from '../src/utils/theme';

function SettingRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </Pressable>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const handleResetOnboarding = () => {
    Alert.alert('Reset onboarding', 'This will take you back through setup on next launch.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(ONBOARDED_KEY);
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <SectionCard title="Account">
        <SettingRow label="Edit profile"        onPress={() => router.push('/profile')} />
        <SettingRow label="Measurements"        onPress={() => router.push('/measurements')} />
        <SettingRow label="Style preferences"   onPress={() => router.push('/style-preferences')} />
      </SectionCard>

      <SectionCard title="Region">
        <SettingRow label="Currency"    value="₹ Indian Rupee" />
        <SettingRow label="Language"    value="English" />
      </SectionCard>

      <SectionCard title="About">
        <SettingRow label="Version"     value="1.0.0" />
        <SettingRow label="Privacy policy" />
        <SettingRow label="Terms of service" />
      </SectionCard>

      <PrimaryButton variant="ghost" onPress={handleResetOnboarding}>
        Reset onboarding
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: FontSize.base, color: Colors.textPrimary },
  rowValue: { fontSize: FontSize.sm,   color: Colors.textSecondary },
});
