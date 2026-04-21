import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f6f1ea" },
          headerTintColor: "#1e293b",
          contentStyle: { backgroundColor: "#fffaf5" }
        }}
      />
    </SafeAreaProvider>
  );
}
