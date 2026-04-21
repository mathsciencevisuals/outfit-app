import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export function PrimaryButton({
  onPress,
  children
}: PropsWithChildren<{ onPress?: () => void }>) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center"
  },
  text: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 16
  }
});
