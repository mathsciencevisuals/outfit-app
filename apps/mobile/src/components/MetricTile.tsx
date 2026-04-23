import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#faf5ee",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5d6c0",
    gap: 4
  },
  label: {
    color: "#836b4d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  value: {
    color: "#182033",
    fontSize: 22,
    fontWeight: "700"
  },
  caption: {
    color: "#6a7280",
    fontSize: 12,
    lineHeight: 18
  }
});
