import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function AuthScreen() {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await mobileApi.login(email, password)
          : await mobileApi.register(email, password, firstName, lastName);

      setSession({ token: result.accessToken, user: result.user });
      router.replace("/profile");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (mode === "register" && (!firstName.trim() || !lastName.trim()));

  return (
    <Screen>
      <SectionCard
        eyebrow="Member Access"
        title={mode === "login" ? "Return to your fit profile" : "Create your FitMe account"}
        subtitle="Keep measurements, recommendations, and try-on progress connected across sessions."
      >
        <View style={styles.heroRow}>
          <Pill label={mode === "login" ? "Secure sign in" : "New account"} tone="accent" />
          <Pill label="JWT session" tone="neutral" />
        </View>
        <SegmentedControl
          options={["Sign in", "Create account"]}
          selected={mode === "login" ? "Sign in" : "Create account"}
          onSelect={(value) => setMode(value === "Sign in" ? "login" : "register")}
        />
        {mode === "register" && (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              placeholderTextColor="#978b7d"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              placeholderTextColor="#978b7d"
            />
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#978b7d"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#978b7d"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton onPress={submit} disabled={disabled}>
          {loading ? "Saving session..." : mode === "login" ? "Enter FitMe" : "Create account"}
        </PrimaryButton>
        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.toggle}>
            {mode === "login" ? "Need an account? Create one" : "Already registered? Sign in"}
          </Text>
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4d7c5",
    backgroundColor: "#fbf8f3",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#172033"
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  error: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20
  },
  toggle: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600"
  }
});
