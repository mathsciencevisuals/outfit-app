import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { mobileApi } from "../src/services/api";
import { useAppStore } from "../src/store/app-store";
import { colors, fonts } from "../src/theme/design";

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
            backgroundColor: colors.page
          }}
        >
          <ActivityIndicator color={colors.ink} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return <Redirect href="/auth" />;
  }

  if (isAuthenticated && rootSegment === "auth") {
    return <Redirect href="/feed" />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f6efe5" },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 24,
            color: colors.ink,
            fontFamily: fonts.display
          },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: colors.page },
          animation: "fade"
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="discover" options={{ headerShown: false }} />
        <Stack.Screen name="demo-checklist" options={{ title: "Demo Checklist" }} />
        <Stack.Screen name="measurements" options={{ title: "Measurements" }} />
        <Stack.Screen name="style-preferences" options={{ title: "Style Preferences" }} />
        <Stack.Screen name="budget" options={{ title: "Budget" }} />
        <Stack.Screen name="recommendations" options={{ title: "Recommendations" }} />
        <Stack.Screen name="saved-looks" options={{ headerShown: false }} />
        <Stack.Screen name="shops" options={{ headerShown: false }} />
        <Stack.Screen name="tryon-upload" options={{ headerShown: false }} />
        <Stack.Screen name="processing" options={{ headerShown: false }} />
        <Stack.Screen name="tryon-result" options={{ title: "Try-On Result" }} />
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
