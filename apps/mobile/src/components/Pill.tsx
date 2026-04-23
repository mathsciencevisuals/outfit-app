import { StyleSheet, Text, View } from "react-native";

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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    borderWidth: 1
  },
  neutral: {
    backgroundColor: "#f2eadf",
    borderColor: "#e4d6c0"
  },
  accent: {
    backgroundColor: "#e7e1d7",
    borderColor: "#d7c9b6"
  },
  success: {
    backgroundColor: "#dcefe2",
    borderColor: "#b9dcc2"
  },
  warning: {
    backgroundColor: "#f8ead6",
    borderColor: "#efcf9f"
  },
  danger: {
    backgroundColor: "#f5dddb",
    borderColor: "#e6b9b2"
  },
  info: {
    backgroundColor: "#e4edf7",
    borderColor: "#c3d6ed"
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3
  },
  neutralText: {
    color: "#695a47"
  },
  accentText: {
    color: "#172033"
  },
  successText: {
    color: "#1d5b36"
  },
  warningText: {
    color: "#8a4f12"
  },
  dangerText: {
    color: "#8e2f2b"
  },
  infoText: {
    color: "#294b74"
  }
});
