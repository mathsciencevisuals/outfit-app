import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { mobileApi } from "../src/services/api";
import { useAppStore } from "../src/store/app-store";

const publicRoutes = new Set(["onboarding", "auth"]);

export default function RootLayout() {
  const segments = useSegments();
  const { token, isAuthenticated, authChecked, finishAuthCheck, logout, setSession, setProfile } = useAppStore();

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      if (!token) {
        finishAuthCheck();
        return;
      }

      try {
        const session = await mobileApi.session();
        if (!mounted) {
          return;
        }

        setSession({ token, user: session.user });
        if (session.user.profile) {
          setProfile(session.user.profile);
        } else {
          const profile = await mobileApi.profile(session.user.id);
          if (mounted) {
            setProfile(profile);
          }
        }
        finishAuthCheck();
      } catch {
        if (!mounted) {
          return;
        }
        await logout();
      }
    };

    void validate();

    return () => {
      mounted = false;
    };
  }, [token, finishAuthCheck, logout, setProfile, setSession]);

  const rootSegment = segments[0];
  const isPublicRoute = rootSegment == null || publicRoutes.has(rootSegment);

  if (!authChecked) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f7f1e8"
          }}
        >
          <ActivityIndicator color="#172033" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated && rootSegment != null && publicRoutes.has(rootSegment)) {
    return <Redirect href="/profile" />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f6efe5" },
          headerTintColor: "#182033",
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: "700",
            color: "#182033"
          },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: "#f8f2e8" },
          animation: "fade"
        }}
      >
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="discover" options={{ title: "Discover" }} />
        <Stack.Screen name="measurements" options={{ title: "Measurements" }} />
        <Stack.Screen name="recommendations" options={{ title: "Recommendations" }} />
        <Stack.Screen name="saved-looks" options={{ title: "Saved Looks" }} />
        <Stack.Screen name="shops" options={{ title: "Shops" }} />
        <Stack.Screen name="tryon-upload" options={{ title: "Try-On Upload" }} />
        <Stack.Screen name="tryon-result" options={{ title: "Try-On History" }} />
        <Stack.Screen name="rewards" options={{ title: "Rewards" }} />
        <Stack.Screen name="referrals" options={{ title: "Referrals" }} />
        <Stack.Screen name="coupons" options={{ title: "Coupons" }} />
        <Stack.Screen name="challenges" options={{ title: "Challenges" }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
