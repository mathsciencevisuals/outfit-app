import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, radius } from "../theme/design";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

export function PrimaryButton({
  onPress,
  children,
  disabled,
  variant = "primary",
  size = "md",
  fullWidth = true
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}>) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        size === "sm" ? styles.buttonSmall : styles.buttonMedium,
        variant === "primary" ? styles.primary : variant === "secondary" ? styles.secondary : styles.ghost,
        !fullWidth && styles.inline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" ? styles.primaryText : variant === "secondary" ? styles.secondaryText : styles.ghostText
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5
  },
  buttonMedium: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  buttonSmall: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primary: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  secondary: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.lineStrong
  },
  ghost: {
    backgroundColor: "rgba(255, 249, 241, 0.72)",
    borderColor: colors.lineStrong
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  primaryText: {
    color: colors.panelStrong
  },
  secondaryText: {
    color: colors.ink
  },
  ghostText: {
    color: colors.brand
  },
  inline: {
    alignSelf: "flex-start"
  } as ViewStyle,
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ scale: 0.985 }]
  }
});
