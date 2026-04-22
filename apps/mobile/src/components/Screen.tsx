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
    backgroundColor: "#f7f1e8"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40
  },
  body: {
    gap: 16
  },
  glowTop: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#f2dfc3",
    opacity: 0.6
  },
  glowMiddle: {
    position: "absolute",
    top: 180,
    left: -90,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "#ead7c9",
    opacity: 0.45
  }
});
