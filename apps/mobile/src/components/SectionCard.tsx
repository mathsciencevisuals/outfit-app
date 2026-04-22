import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

export function SectionCard({
  title,
  subtitle,
  eyebrow,
  children
}: PropsWithChildren<{ title: string; subtitle?: string; eyebrow?: string }>) {
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eadcc7",
    shadowColor: "#7f6240",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    gap: 6
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#8a6d4a"
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#172033"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5d687d"
  },
  content: {
    marginTop: 10,
    gap: 12
  }
});
