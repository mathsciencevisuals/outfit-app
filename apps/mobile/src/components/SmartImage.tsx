import { useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radius } from "../theme/design";

export function SmartImage({
  uri,
  label,
  style,
  containerStyle,
  fallbackTone = "default"
}: {
  uri?: string | null;
  label: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackTone?: "default" | "accent" | "warm";
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !uri || failed;

  return (
    <View
      style={[
        styles.container,
        fallbackTone === "accent" && styles.containerAccent,
        fallbackTone === "warm" && styles.containerWarm,
        containerStyle
      ]}
    >
      {showFallback ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackEyebrow}>FitMe</Text>
          <Text style={styles.fallbackLabel} numberOfLines={2}>
            {label}
          </Text>
        </View>
      ) : (
        <Image source={{ uri }} style={[styles.image, style]} resizeMode="cover" onError={() => setFailed(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: "#171928"
  },
  containerAccent: {
    backgroundColor: "#281c48"
  },
  containerWarm: {
    backgroundColor: "#35291f"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  fallback: {
    flex: 1,
    minHeight: 120,
    padding: 16,
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  fallbackEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  fallbackLabel: {
    color: colors.inkOnDark,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800"
  }
});
