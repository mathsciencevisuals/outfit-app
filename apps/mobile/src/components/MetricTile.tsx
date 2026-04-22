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
    backgroundColor: "#f8f3eb",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8dac5",
    gap: 4
  },
  label: {
    color: "#846f55",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  value: {
    color: "#172033",
    fontSize: 22,
    fontWeight: "700"
  },
  caption: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18
  }
});
