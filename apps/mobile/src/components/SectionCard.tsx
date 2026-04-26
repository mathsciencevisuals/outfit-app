import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  children,
  style,
  noPadding = false,
}: PropsWithChildren<SectionCardProps>) {
  return (
    <View style={[styles.card, noPadding && styles.noPadding, Shadow.sm, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={[styles.content, (title || subtitle) && styles.contentGap]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noPadding: { padding: 0, overflow: 'hidden' },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  content:    { gap: Spacing.sm },
  contentGap: { marginTop: Spacing.md },
});
