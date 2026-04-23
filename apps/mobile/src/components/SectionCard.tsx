import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, shadow } from "../theme/design";

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
    backgroundColor: colors.panel,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
    ...shadow
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.brand
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    fontFamily: fonts.display
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft
  },
  content: {
    marginTop: 10,
    gap: 12
  }
});
