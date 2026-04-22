import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Product, Recommendation } from "../types/api";
import { Pill } from "./Pill";
import { PrimaryButton } from "./PrimaryButton";

export function ProductCard({
  title,
  subtitle,
  badge,
  scoreLabel,
  highlight,
  onPrimaryPress,
  primaryLabel,
  onSecondaryPress,
  secondaryLabel
}: {
  title: string;
  subtitle: string;
  badge?: string;
  scoreLabel?: string;
  highlight?: string;
  onPrimaryPress?: () => void;
  primaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryLabel?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        <View style={styles.previewOrbLarge} />
        <View style={styles.previewOrbSmall} />
        {badge ? <Pill label={badge} tone="accent" /> : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
        <View style={styles.metaRow}>
          {scoreLabel ? (
            <View style={styles.metaBadge}>
              <Feather name="star" size={14} color="#172033" />
              <Text style={styles.metaText}>{scoreLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          {primaryLabel ? <PrimaryButton onPress={onPrimaryPress}>{primaryLabel}</PrimaryButton> : null}
          {secondaryLabel ? (
            <PrimaryButton onPress={onSecondaryPress} variant="secondary">
              {secondaryLabel}
            </PrimaryButton>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function recommendationBadge(recommendation: Recommendation) {
  if (recommendation.score >= 90) {
    return "Elite Match";
  }
  if (recommendation.score >= 78) {
    return "Best Bet";
  }
  return "Worth Trying";
}

export function productSubtitle(product?: Product) {
  const parts = [product?.brand?.name, product?.category, product?.baseColor].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Fit-aware catalog piece";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eadcc7"
  },
  preview: {
    minHeight: 132,
    backgroundColor: "#efe3d2",
    padding: 16,
    justifyContent: "space-between"
  },
  previewOrbLarge: {
    position: "absolute",
    right: -16,
    top: -10,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "#dbc3a3"
  },
  previewOrbSmall: {
    position: "absolute",
    left: 24,
    bottom: -24,
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: "#c8d3d0"
  },
  copy: {
    padding: 16,
    gap: 10
  },
  title: {
    color: "#172033",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700"
  },
  subtitle: {
    color: "#6a7284",
    fontSize: 14
  },
  highlight: {
    color: "#4f5a6d",
    fontSize: 14,
    lineHeight: 20
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#f4eee6"
  },
  metaText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "600"
  },
  actions: {
    gap: 10
  }
});
