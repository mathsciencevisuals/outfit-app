import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../theme/design";

export function MetricTile({
  label,
  value,
  caption
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#fcf8f2",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4
  },
  label: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  value: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.display
  },
  caption: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  }
});
