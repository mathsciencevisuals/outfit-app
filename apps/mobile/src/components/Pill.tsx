import { StyleSheet, Text, View } from "react-native";

export function Pill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  return (
    <View
      style={[
        styles.base,
        tone === "accent" ? styles.accent : tone === "success" ? styles.success : tone === "warning" ? styles.warning : styles.neutral
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === "accent" ? styles.accentText : tone === "success" ? styles.successText : tone === "warning" ? styles.warningText : styles.neutralText
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start"
  },
  neutral: {
    backgroundColor: "#f2eadf"
  },
  accent: {
    backgroundColor: "#e6ddd2"
  },
  success: {
    backgroundColor: "#dcefe2"
  },
  warning: {
    backgroundColor: "#f7e6cf"
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
  }
});
