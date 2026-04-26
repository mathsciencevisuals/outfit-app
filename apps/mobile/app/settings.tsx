import { View } from 'react-native';
import { AppHeader } from '../src/components/AppHeader';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';
export default function SettingsPage() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Settings" />
      <SettingsScreen />
    </View>
  );
}
