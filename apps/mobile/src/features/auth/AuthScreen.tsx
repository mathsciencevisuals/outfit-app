import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function AuthScreen() {
  const router = useRouter();
  const { setUserId, setToken, setAuthenticated } = useAppStore();

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

      setToken(result.accessToken);
      setUserId(result.user.id);
      setAuthenticated(true);
      router.replace("/profile");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard
        title={mode === "login" ? "Sign in" : "Create account"}
        subtitle="Access your FitMe profile"
      >
        {mode === "register" && (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
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
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton onPress={submit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </PrimaryButton>
        <Text style={styles.toggle} onPress={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  half: {
    flex: 1,
  },
  error: {
    color: "#dc2626",
    marginBottom: 8,
    fontSize: 14,
  },
  toggle: {
    textAlign: "center",
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
  },
});
