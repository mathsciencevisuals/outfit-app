import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../utils/theme';

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}

export function InfoRow({ label, value, valueColor, last = false }: InfoRowProps) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  value: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
});
