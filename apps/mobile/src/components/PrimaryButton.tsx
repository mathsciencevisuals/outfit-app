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
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 13
  },
  buttonSmall: {
    minHeight: 40,
    paddingHorizontal: 15,
    paddingVertical: 10
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong,
    shadowColor: colors.accentStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6
  },
  secondary: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.lineStrong
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: colors.line
  },
  text: {
    fontSize: 14,
    fontWeight: "800",
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
