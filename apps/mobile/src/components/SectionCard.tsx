import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, shadow } from "../theme/design";

export function SectionCard({
  title,
  subtitle,
  eyebrow,
  children,
  tone = "light"
}: PropsWithChildren<{ title: string; subtitle?: string; eyebrow?: string; tone?: "light" | "dark" }>) {
  return (
    <View style={[styles.card, tone === "dark" && styles.cardDark]}>
      {eyebrow ? <Text style={[styles.eyebrow, tone === "dark" && styles.eyebrowDark]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, tone === "dark" && styles.titleDark]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, tone === "dark" && styles.subtitleDark]}>{subtitle}</Text> : null}
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
    overflow: "hidden",
    ...shadow
  },
  cardDark: {
    backgroundColor: colors.panelDark,
    borderColor: colors.lineDark
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.brand
  },
  eyebrowDark: {
    color: colors.inkOnDarkSoft
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    fontFamily: fonts.display
  },
  titleDark: {
    color: colors.inkOnDark
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft
  },
  subtitleDark: {
    color: colors.inkOnDarkSoft
  },
  content: {
    marginTop: 10,
    gap: 12
  }
});
