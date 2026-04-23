import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/design";

export function InfoRow({
  label,
  value,
  emphasized = false
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <View style={[styles.row, emphasized && styles.rowEmphasized]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasized && styles.valueEmphasized]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eadfce"
  },
  rowEmphasized: {
    borderBottomColor: colors.lineStrong
  },
  label: {
    flex: 1,
    color: colors.brand,
    fontSize: 14,
    fontWeight: "500"
  },
  value: {
    flex: 1,
    color: colors.ink,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "right"
  },
  valueEmphasized: {
    fontSize: 16,
    color: colors.ink
  }
});
