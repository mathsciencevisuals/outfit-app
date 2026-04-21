import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

export function SectionCard({
  title,
  subtitle,
  children
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 10
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#172033"
  },
  subtitle: {
    fontSize: 14,
    color: "#52607a"
  },
  content: {
    gap: 10
  }
});
