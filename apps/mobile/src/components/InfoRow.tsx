import { StyleSheet, Text, View } from "react-native";

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#efe5d8"
  },
  label: {
    color: "#64748b",
    fontSize: 14
  },
  value: {
    color: "#0f172a",
    fontWeight: "600"
  }
});
