import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
      } else if (value && (first === 'onboarding' || first === undefined || first === 'index')) {
        router.replace('/dashboard');
      }
    });
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="measurements" />
          <Stack.Screen name="style-preferences" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="tryme" />
          <Stack.Screen name="recommendations" />
          <Stack.Screen name="saved-looks" />
          <Stack.Screen name="profile-main" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="tryon-upload"    options={{ presentation: 'modal' }} />
          <Stack.Screen name="tryon-result"    options={{ presentation: 'modal' }} />
          <Stack.Screen name="shops" />
        </Stack>
      </NavigationGuard>
    </SafeAreaProvider>
  );
}
