import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { demoData } from "../../demo/demo-data";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import { demoModeEnabled } from "../../utils/env";

export function AuthScreen() {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const startDemoSession = useAppStore((state) => state.startDemoSession);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(demoModeEnabled ? "demo@fitme.dev" : "");
  const [password, setPassword] = useState(demoModeEnabled ? "fitme1234" : "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await mobileApi.login(email, password)
          : await mobileApi.register(email, password, firstName, lastName);

      setSession({ token: result.accessToken, user: result.user });
      router.replace("/onboarding");
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const startGuestJourney = () => {
    setError(null);
    startDemoSession({
      token: demoData.demoToken,
      user: demoData.session.user,
      profile: demoData.profile,
      tryOnRequestId: demoData.tryOnRequest.id
    });
    router.replace("/onboarding");
  };

  const startDemoJourney = () => {
    setError(null);
    startDemoSession({
      token: demoData.demoToken,
      user: demoData.session.user,
      profile: demoData.profile,
      tryOnRequestId: demoData.tryOnRequest.id
    });
    router.replace("/feed");
  };

  const disabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (mode === "register" && (!firstName.trim() || !lastName.trim()));

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            <Feather name="star" size={22} color={colors.inkOnDark} />
          </View>
          <Text style={styles.heroTitle}>Style Studio</Text>
          <Text style={styles.heroSubtitle}>Virtual fitting, fit intelligence, and retail handoff in one screenshot-ready flow.</Text>
          <View style={styles.badgeRow}>
            <Badge label="AI try-on" />
            <Badge label="Demo mode" />
            <Badge label="Fit-aware" />
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.modeRow}>
            <ModeButton label="Sign In" active={mode === "login"} onPress={() => setMode("login")} />
            <ModeButton label="Sign Up" active={mode === "register"} onPress={() => setMode("register")} />
          </View>

          {mode === "register" ? (
            <View style={styles.inlineRow}>
              <Input value={firstName} onChangeText={setFirstName} placeholder="First name" />
              <Input value={lastName} onChangeText={setLastName} placeholder="Last name" />
            </View>
          ) : null}

          <Input value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
          <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

          <View style={styles.demoHint}>
            <Text style={styles.demoHintTitle}>Demo credentials</Text>
            <Text style={styles.demoHintBody}>`demo@fitme.dev` / `fitme1234`</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton onPress={authenticate} disabled={disabled}>
            {loading ? "Connecting..." : mode === "login" ? "Sign In" : "Create Account"}
          </PrimaryButton>
          <PrimaryButton onPress={startGuestJourney} variant="secondary">
            Continue as Guest
          </PrimaryButton>
          <PrimaryButton onPress={startDemoJourney} variant="ghost">
            Try Demo
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

function Input(props: ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={colors.inkMuted} style={[styles.input, props.style]} />;
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 18,
    minHeight: "100%",
    justifyContent: "center"
  },
  heroCard: {
    gap: 14,
    padding: 24,
    borderRadius: radius.xl,
    backgroundColor: "rgba(20,22,36,0.84)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 15,
    lineHeight: 23
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.26)"
  },
  badgeText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "700"
  },
  formCard: {
    gap: 12,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: "rgba(18,20,32,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  modeRow: {
    flexDirection: "row",
    gap: 8
  },
  modeButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  modeButtonText: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    fontWeight: "700"
  },
  modeButtonTextActive: {
    color: colors.inkOnDark
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    color: colors.inkOnDark,
    fontSize: 16
  },
  demoHint: {
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  demoHintTitle: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  demoHintBody: {
    marginTop: 4,
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  error: {
    color: "#fda4af",
    fontSize: 14
  },
  pressed: {
    opacity: 0.9
  }
});
