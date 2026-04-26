import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { colors } from "../../theme/design";

const lines = [
  "Creating Your Try-On",
  "Processing selected item",
  "Manifesting the drip",
  "Rendering main-character energy"
];

export function TryOnProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ item?: string }>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const textTimer = setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, 900);

    const navTimer = setTimeout(() => {
      router.replace("/tryon-result");
    }, 2600);

    return () => {
      clearInterval(textTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
        <Text style={styles.title}>{lines[index]}</Text>
        <Text style={styles.body}>{params.item ? `Processing ${params.item}...` : "Preparing your generated look..."}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  spinnerWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.14)"
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    color: colors.inkOnDarkSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  }
});
