import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/store/app-store';
import { mobileApi } from '../src/services/api';
import { Colors } from '../src/utils/theme';

export const ONBOARDED_KEY = 'fitme_onboarded';

const ONBOARDING_SCREENS = ['onboarding', 'profile', 'measurements', 'style-preferences'];
const AUTH_SCREENS = ['auth'];

function StartupRedirector({ onReady }: { onReady: () => void }) {
  const router   = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!navigationState?.key || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    let mounted = true;

    const checkNavigation = async () => {
      let didNavigate = false;
      try {
        const first = segments[0] as string | undefined;
        const inAuth = AUTH_SCREENS.includes(first ?? '');
        const inOnboarding = ONBOARDING_SCREENS.includes(first ?? '');
        const accessToken = useAppStore.getState().accessToken;

        let isAuthenticated = false;
        if (accessToken) {
          try {
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Session check timed out')), 6000)
            );
            const session = await Promise.race([mobileApi.session(), timeout]);
            useAppStore.getState().setSession({
              userId: session.user.id,
              accessToken,
            });
            isAuthenticated = true;
          } catch (error) {
            console.warn('[FitMe] Existing session is no longer valid.', error);
            useAppStore.getState().setAccessToken(null);
          }
        }

        if (!isAuthenticated) {
          if (!inAuth) {
            router.replace('/auth');
            didNavigate = true;
          }
          return;
        }

        const value = await AsyncStorage.getItem(ONBOARDED_KEY);

        if (!value && !inOnboarding) {
          router.replace('/onboarding');
          didNavigate = true;
        } else if (value && (inAuth || first === 'onboarding' || first === undefined || first === 'index')) {
          router.replace('/dashboard');
          didNavigate = true;
        }
      } catch (error) {
        console.warn('[FitMe] Failed to read onboarding state during app startup.', error);
        router.replace('/auth');
        didNavigate = true;
      } finally {
        // If we navigated, wait for the transition to paint before removing the
        // loading overlay — prevents a flash of the wrong screen.
        if (mounted) {
          if (didNavigate) {
            setTimeout(() => { if (mounted) onReady(); }, 300);
          } else {
            onReady();
          }
        }
      }
    };

    checkNavigation();

    return () => {
      mounted = false;
    };
  }, [navigationState?.key, onReady, router, segments]);

  return null;
}

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(useAppStore.persist.hasHydrated());
    return unsubscribe;
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={styles.root}>
        {hydrated ? (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="measurements" />
              <Stack.Screen name="style-preferences" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="discover" />
              <Stack.Screen name="tryme" />
              <Stack.Screen name="recommendations" />
              <Stack.Screen name="saved-looks" />
              <Stack.Screen name="profile-main" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="tryon-upload"    options={{ presentation: 'modal' }} />
              <Stack.Screen name="tryon-result"    options={{ presentation: 'modal' }} />
              <Stack.Screen name="shops" />
            </Stack>
            <StartupRedirector onReady={() => setChecked(true)} />
          </>
        ) : null}
        {!hydrated || !checked ? (
          <View style={styles.loadingScreen} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingScreen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
});
