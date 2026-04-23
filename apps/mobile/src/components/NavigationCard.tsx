import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme/design";

type NavigationCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  badge?: string | null;
  onPress: () => void;
};

export function NavigationCard({ icon, title, subtitle, badge, onPress }: NavigationCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={17} color={colors.ink} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.chevronWrap}>
        <Feather name="chevron-right" size={17} color={colors.brand} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }]
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pageStrong
  },
  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelMuted
  },
  copy: {
    flex: 1,
    gap: 4
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7
  }
});
