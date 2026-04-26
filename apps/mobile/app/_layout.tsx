import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/utils/theme';

export const ONBOARDED_KEY = 'fitme_onboarded';

const ONBOARDING_SCREENS = ['onboarding', 'profile', 'measurements', 'style-preferences'];

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((value) => {
      setChecked(true);
      const first = segments[0] as string | undefined;
      const inOnboarding = ONBOARDING_SCREENS.includes(first ?? '');
      if (!value && !inOnboarding) {
        router.replace('/onboarding');
      } else if (value && (first === 'onboarding' || first === undefined)) {
        router.replace('/discover');
      }
    });
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}

function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/settings' as never)}
      hitSlop={12}
      style={{ marginRight: 4 }}
    >
      <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
    </Pressable>
  );
}

const commonHeaderOptions = {
  headerStyle:        { backgroundColor: Colors.surface2 },
  headerTintColor:    Colors.textPrimary,
  headerShadowVisible: false,
  headerBackTitle:    'Back',
  headerRight:        () => <SettingsButton />,
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationGuard>
        <Stack screenOptions={commonHeaderOptions}>
          <Stack.Screen name="index"            options={{ headerShown: false }} />
          <Stack.Screen name="onboarding"       options={{ headerShown: false }} />
          <Stack.Screen name="profile"          options={{ title: 'Your Profile' }} />
          <Stack.Screen name="measurements"     options={{ title: 'Measurements' }} />
          <Stack.Screen name="style-preferences" options={{ title: 'Style Preferences' }} />
          <Stack.Screen name="discover"         options={{ title: 'Discover' }} />
          <Stack.Screen name="tryon-upload"     options={{ title: 'Try On', presentation: 'modal' }} />
          <Stack.Screen name="tryon-result"     options={{ title: 'Your Look', presentation: 'modal' }} />
          <Stack.Screen name="recommendations"  options={{ title: 'Recommendations' }} />
          <Stack.Screen name="shops"            options={{ title: 'Shops' }} />
          <Stack.Screen name="saved-looks"      options={{ title: 'Saved Looks' }} />
          <Stack.Screen name="profile-main"     options={{ title: 'Profile' }} />
          <Stack.Screen name="settings"         options={{ title: 'Settings' }} />
        </Stack>
      </NavigationGuard>
    </SafeAreaProvider>
  );
}
