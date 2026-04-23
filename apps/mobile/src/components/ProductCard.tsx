import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Product, Recommendation } from "../types/api";
import { colors, fonts, radius } from "../theme/design";
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
        <View style={styles.previewCaption}>
          <Text style={styles.previewCaptionLabel}>Recommendation</Text>
          <Text style={styles.previewCaptionText}>Fit, style, budget, and retail cues aligned in one card.</Text>
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
              <Feather name="star" size={14} color={colors.ink} />
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
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line
  },
  preview: {
    minHeight: 146,
    backgroundColor: colors.pageStrong,
    padding: 16,
    justifyContent: "space-between"
  },
  previewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap"
  },
  previewCaption: {
    gap: 4
  },
  previewCaptionLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  previewCaptionText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: "80%"
  },
  previewOrbLarge: {
    position: "absolute",
    right: -16,
    top: -10,
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    backgroundColor: "#dbc6aa"
  },
  previewOrbSmall: {
    position: "absolute",
    left: 24,
    bottom: -24,
    width: 74,
    height: 74,
    borderRadius: radius.pill,
    backgroundColor: "#d9e1de"
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
    gap: 3
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: fonts.display
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pageStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  metaText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  fitSummary: {
    backgroundColor: "#faf4eb",
    borderRadius: radius.lg,
    padding: 14,
    gap: 10
  },
  fitSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  fitSummaryTitle: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  fitSummarySize: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  warning: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 20
  },
  highlight: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  issueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actions: {
    gap: 8
  }
});
