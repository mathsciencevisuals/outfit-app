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
      <Text numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.panelStrong,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4
  },
  label: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  value: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.display
  },
  caption: {
    color: colors.inkSoft,
    fontSize: 11,
    lineHeight: 16
  }
});
