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
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1
  },
  neutral: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(99,91,255,0.24)"
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: "rgba(26,163,111,0.18)"
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: "rgba(217,139,25,0.18)"
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(213,91,103,0.2)"
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: "rgba(47,109,246,0.18)"
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  neutralText: {
    color: colors.brand
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
