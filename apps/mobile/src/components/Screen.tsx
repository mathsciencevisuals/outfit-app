import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { colors } from "../theme/design";

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />
      <View style={styles.glowMiddle} />
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 144
  },
  body: {
    gap: 16
  },
  glowTop: {
    position: "absolute",
    top: -56,
    right: -18,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#f1ddc0",
    opacity: 0.68
  },
  glowRight: {
    position: "absolute",
    top: 112,
    right: -60,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "#efe1cd",
    opacity: 0.72
  },
  glowMiddle: {
    position: "absolute",
    top: 210,
    left: -96,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#ead8c9",
    opacity: 0.52
  }
});
