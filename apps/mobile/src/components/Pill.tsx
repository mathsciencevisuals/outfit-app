import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme/design";

type PillTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export function Pill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: PillTone;
}) {
  const backgroundStyle =
    tone === "accent"
      ? styles.accent
      : tone === "success"
        ? styles.success
        : tone === "warning"
          ? styles.warning
          : tone === "danger"
            ? styles.danger
            : tone === "info"
              ? styles.info
              : styles.neutral;

  const textStyle =
    tone === "accent"
      ? styles.accentText
      : tone === "success"
        ? styles.successText
        : tone === "warning"
          ? styles.warningText
          : tone === "danger"
            ? styles.dangerText
            : tone === "info"
              ? styles.infoText
              : styles.neutralText;

  return (
    <View style={[styles.base, backgroundStyle]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    borderWidth: 1
  },
  neutral: {
    backgroundColor: "#efe5d7",
    borderColor: colors.line
  },
  accent: {
    backgroundColor: "#dde5ea",
    borderColor: "#c8d4dc"
  },
  success: {
    backgroundColor: "#ddefe4",
    borderColor: "#bfddcc"
  },
  warning: {
    backgroundColor: "#f5e5d3",
    borderColor: "#ebc89a"
  },
  danger: {
    backgroundColor: "#f2dfdb",
    borderColor: "#dfb5ad"
  },
  info: {
    backgroundColor: "#e4edf7",
    borderColor: "#c7d9eb"
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3
  },
  neutralText: {
    color: "#6a5742"
  },
  accentText: {
    color: colors.accent
  },
  successText: {
    color: colors.success
  },
  warningText: {
    color: colors.warning
  },
  dangerText: {
    color: colors.danger
  },
  infoText: {
    color: colors.info
  }
});
