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
    backgroundColor: "rgba(255,251,245,0.96)",
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e6d8c2",
    shadowColor: "#5f4930",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    gap: 6
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#8b6b47"
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#182033"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5d6678"
  },
  content: {
    marginTop: 10,
    gap: 12
  }
});
