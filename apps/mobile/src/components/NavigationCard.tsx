import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        <Feather name={icon} size={18} color="#182033" />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#715d47" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 22,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: "#e6d8c2"
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }]
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee3d2"
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
    color: "#182033",
    fontSize: 16,
    fontWeight: "700"
  },
  subtitle: {
    color: "#5d6678",
    fontSize: 13,
    lineHeight: 19
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#efe3cf",
    color: "#7b6449",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  }
});
