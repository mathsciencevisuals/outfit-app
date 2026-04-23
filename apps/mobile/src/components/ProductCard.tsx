import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Product, Recommendation } from "../types/api";
import { Pill } from "./Pill";
import { PrimaryButton } from "./PrimaryButton";

function fitTone(fitLabel?: string | null) {
  if (fitLabel === "slim") {
    return "accent" as const;
  }
  if (fitLabel === "relaxed") {
    return "info" as const;
  }
  return "neutral" as const;
}

function confidenceTone(confidenceLabel?: string | null) {
  const percent = Number((confidenceLabel ?? "").match(/[0-9]+/)?.[0] ?? 0);
  if (percent >= 82) {
    return "success" as const;
  }
  if (percent >= 65) {
    return "info" as const;
  }
  return "warning" as const;
}

function issueTone(issue: string) {
  if (issue.includes("tight") || issue.includes("short")) {
    return "danger" as const;
  }
  return "warning" as const;
}

function badgeTone(entry: string) {
  if (entry.includes("Budget") || entry.includes("Price")) {
    return "warning" as const;
  }
  if (entry.includes("Fit")) {
    return "success" as const;
  }
  return "info" as const;
}

function humanizeIssue(issue: string) {
  return issue
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProductCard({
  title,
  subtitle,
  badge,
  scoreLabel,
  highlight,
  fitLabel,
  confidenceLabel,
  bestSizeLabel,
  warning,
  issueLabels,
  contextTags,
  rankingBadges,
  priceLabel,
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
  fitLabel?: string | null;
  confidenceLabel?: string | null;
  bestSizeLabel?: string | null;
  warning?: string | null;
  issueLabels?: string[];
  contextTags?: string[];
  rankingBadges?: string[];
  priceLabel?: string | null;
  onPrimaryPress?: () => void;
  primaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryLabel?: string;
}) {
  const hasFitSummary = Boolean(bestSizeLabel || fitLabel || confidenceLabel);

  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        <View style={styles.previewOrbLarge} />
        <View style={styles.previewOrbSmall} />
        <View style={styles.previewTopRow}>
          {badge ? <Pill label={badge} tone="accent" /> : null}
          {priceLabel ? <Pill label={priceLabel} tone="warning" /> : null}
        </View>
      </View>
      <View style={styles.copy}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {scoreLabel ? (
            <View style={styles.metaBadge}>
              <Feather name="star" size={14} color="#172033" />
              <Text style={styles.metaText}>{scoreLabel}</Text>
            </View>
          ) : null}
        </View>

        {hasFitSummary ? (
          <View style={styles.fitSummary}>
            <View style={styles.fitSummaryHeader}>
              <Text style={styles.fitSummaryTitle}>Fit read</Text>
              {bestSizeLabel ? <Text style={styles.fitSummarySize}>Size {bestSizeLabel}</Text> : null}
            </View>
            <View style={styles.metaRow}>
              {fitLabel ? <Pill label={`${fitLabel} fit`} tone={fitTone(fitLabel)} /> : null}
              {confidenceLabel ? <Pill label={confidenceLabel} tone={confidenceTone(confidenceLabel)} /> : null}
              {bestSizeLabel ? <Pill label="Recommended" tone="success" /> : null}
            </View>
            {warning ? <Text style={styles.warning}>{warning}</Text> : null}
          </View>
        ) : null}

        {(rankingBadges?.length ?? 0) > 0 ? (
          <View style={styles.metaRow}>
            {rankingBadges?.slice(0, 3).map((entry) => (
              <Pill key={entry} label={entry} tone={badgeTone(entry)} />
            ))}
          </View>
        ) : null}

        {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}

        {(contextTags?.length ?? 0) > 0 ? (
          <View style={styles.issueRow}>
            {contextTags?.slice(0, 4).map((tag) => (
              <Pill key={tag} label={tag} tone="info" />
            ))}
          </View>
        ) : null}

        {(issueLabels?.length ?? 0) > 0 ? (
          <View style={styles.issueRow}>
            {issueLabels?.slice(0, 3).map((issue) => (
              <Pill key={issue} label={humanizeIssue(issue)} tone={issueTone(issue)} />
            ))}
          </View>
        ) : null}

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
  const fitScore = recommendation.fitResult?.fitScore ?? recommendation.score;
  const confidence = recommendation.fitResult?.confidenceScore ?? 0;
  const issueCount = recommendation.fitResult?.issues?.length ?? 0;

  if ((recommendation.rankingBadges ?? []).includes("Best Fit") || (fitScore >= 90 && confidence >= 0.78 && issueCount === 0)) {
    return "Best Fit";
  }
  if ((recommendation.rankingBadges ?? []).includes("Budget Pick")) {
    return "Budget Pick";
  }
  if ((recommendation.rankingBadges ?? []).includes("Trending")) {
    return "Trending";
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
  previewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap"
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
    gap: 12
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  headerCopy: {
    flex: 1,
    gap: 4
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
  fitSummary: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#fbf6ef",
    borderWidth: 1,
    borderColor: "#eadcc7",
    gap: 10
  },
  fitSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  fitSummaryTitle: {
    color: "#786145",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  fitSummarySize: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "700"
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
  warning: {
    color: "#8a4f12",
    fontSize: 13,
    lineHeight: 19
  },
  issueRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actions: {
    gap: 10
  }
});
