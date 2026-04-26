import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

interface PrimaryButtonProps {
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  onPress,
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: PropsWithChildren<PrimaryButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.white : Colors.primary}
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary:   { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: Colors.error },

  disabled:  { opacity: 0.45 },
  pressed:   { opacity: 0.80 },

  text:         { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  text_primary:   { color: Colors.white },
  text_secondary: { color: Colors.textPrimary },
  text_outline:   { color: Colors.primary },
  text_ghost:     { color: Colors.primary },
  text_danger:    { color: Colors.white },
});
