import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../utils/theme';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ icon, title, subtitle, action, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action && onAction ? (
        <PrimaryButton onPress={onAction} style={styles.btn}>{action}</PrimaryButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.sm,
  },
  icon:     { fontSize: 40 },
  title:    { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  btn:      { marginTop: Spacing.md },
});
