import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';

interface SectionCardProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  style,
  noPadding = false,
}: PropsWithChildren<SectionCardProps>) {
  return (
    <View style={[styles.card, noPadding && styles.noPadding, Shadow.sm, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={[styles.content, Boolean(title || subtitle || eyebrow) && styles.contentGap]}>
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
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
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
