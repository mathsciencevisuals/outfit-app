import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.glowTop} />
      <View style={styles.glowMiddle} />
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f2e8"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 48
  },
  body: {
    gap: 16
  },
  glowTop: {
    position: "absolute",
    top: -70,
    right: -28,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "#ecd8b8",
    opacity: 0.72
  },
  glowMiddle: {
    position: "absolute",
    top: 210,
    left: -96,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#e7d6cb",
    opacity: 0.52
  }
});
