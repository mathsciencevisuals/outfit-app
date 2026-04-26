import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useAppStore } from "../store/app-store";
import { colors } from "../theme/design";
import { AppProfileStrip } from "./AppProfileStrip";

export function Screen({
  children,
  tone = "light",
  showProfileStrip = true
}: PropsWithChildren<{ tone?: "light" | "dark"; showProfileStrip?: boolean }>) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <ScrollView contentContainerStyle={styles.content} style={[styles.container, tone === "dark" && styles.containerDark]} showsVerticalScrollIndicator={false}>
      {tone === "light" ? (
        <>
          <View style={styles.glowTop} />
          <View style={styles.glowRight} />
          <View style={styles.glowMiddle} />
        </>
      ) : (
        <>
          <View style={styles.darkGlowTop} />
          <View style={styles.darkGlowBottom} />
          <View style={styles.darkGlowSide} />
        </>
      )}
      <View style={styles.body}>
        {isAuthenticated && showProfileStrip ? <AppProfileStrip tone={tone} /> : null}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page
  },
  containerDark: {
    backgroundColor: colors.panelDarkStrong
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 144
  },
  body: {
    gap: 16
  },
  glowTop: {
    position: "absolute",
    top: -72,
    right: -22,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#e4dcff",
    opacity: 0.8
  },
  glowRight: {
    position: "absolute",
    top: 120,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "#d8e4ff",
    opacity: 0.68
  },
  glowMiddle: {
    position: "absolute",
    top: 260,
    left: -110,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#e9eefb",
    opacity: 0.9
  },
  darkGlowTop: {
    position: "absolute",
    top: -90,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: colors.heroGlow
  },
  darkGlowBottom: {
    position: "absolute",
    bottom: 180,
    left: -90,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "rgba(63,96,255,0.18)"
  },
  darkGlowSide: {
    position: "absolute",
    top: 220,
    right: -80,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)"
  }
});
