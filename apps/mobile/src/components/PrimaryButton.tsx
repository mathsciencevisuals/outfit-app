import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

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
    borderRadius: 999,
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
    backgroundColor: "#182033",
    borderColor: "#182033"
  },
  secondary: {
    backgroundColor: "#efe2cf",
    borderColor: "#dcc8ab"
  },
  ghost: {
    backgroundColor: "rgba(255,250,243,0.72)",
    borderColor: "#d9c4a4"
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  primaryText: {
    color: "#fffaf4"
  },
  secondaryText: {
    color: "#182033"
  },
  ghostText: {
    color: "#6a553b"
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
