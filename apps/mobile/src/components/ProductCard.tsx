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
  secondaryLabel,
  tone = "light"
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
  tone?: "light" | "dark";
}) {
  const hasFitSummary = Boolean(bestSizeLabel || fitLabel || confidenceLabel);
  const dark = tone === "dark";

  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={[styles.preview, dark && styles.previewDark]}>
        <View style={[styles.previewOrbLarge, dark && styles.previewOrbLargeDark]} />
        <View style={[styles.previewOrbSmall, dark && styles.previewOrbSmallDark]} />
        <View style={styles.previewTopRow}>
          {badge ? <Pill label={badge} tone="accent" /> : null}
          {priceLabel ? <Pill label={priceLabel} tone="warning" /> : null}
        </View>
        <View style={styles.previewCaption}>
          <Text style={[styles.previewCaptionLabel, dark && styles.previewCaptionLabelDark]}>Fashion rank</Text>
          <Text style={[styles.previewCaptionText, dark && styles.previewCaptionTextDark]}>
            Bold discovery card with fit, style, budget, and handoff context stacked together.
          </Text>
        </View>
      </View>
      <View style={styles.copy}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
            <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text>
          </View>
          {scoreLabel ? (
            <View style={[styles.metaBadge, dark && styles.metaBadgeDark]}>
              <Feather name="star" size={14} color={dark ? colors.inkOnDark : colors.ink} />
              <Text style={[styles.metaText, dark && styles.metaTextDark]}>{scoreLabel}</Text>
            </View>
          ) : null}
        </View>

        {hasFitSummary ? (
          <View style={[styles.fitSummary, dark && styles.fitSummaryDark]}>
            <View style={styles.fitSummaryHeader}>
              <Text style={[styles.fitSummaryTitle, dark && styles.fitSummaryTitleDark]}>Fit read</Text>
              {bestSizeLabel ? <Text style={[styles.fitSummarySize, dark && styles.fitSummarySizeDark]}>Size {bestSizeLabel}</Text> : null}
            </View>
            <View style={styles.metaRow}>
              {fitLabel ? <Pill label={`${fitLabel} fit`} tone={fitTone(fitLabel)} /> : null}
              {confidenceLabel ? <Pill label={confidenceLabel} tone={confidenceTone(confidenceLabel)} /> : null}
              {bestSizeLabel ? <Pill label="Recommended" tone="success" /> : null}
            </View>
            {warning ? <Text style={[styles.warning, dark && styles.warningDark]}>{warning}</Text> : null}
          </View>
        ) : null}

        {(rankingBadges?.length ?? 0) > 0 ? (
          <View style={styles.metaRow}>
            {rankingBadges?.slice(0, 3).map((entry) => (
              <Pill key={entry} label={entry} tone={badgeTone(entry)} />
            ))}
          </View>
        ) : null}

        {highlight ? <Text style={[styles.highlight, dark && styles.highlightDark]}>{highlight}</Text> : null}

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
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line
  },
  cardDark: {
    backgroundColor: colors.panelDark,
    borderColor: colors.lineDark
  },
  preview: {
    minHeight: 152,
    backgroundColor: colors.pageStrong,
    padding: 16,
    justifyContent: "space-between"
  },
  previewDark: {
    backgroundColor: colors.heroStart
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  previewCaptionLabelDark: {
    color: colors.inkOnDarkSoft
  },
  previewCaptionText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: "80%"
  },
  previewCaptionTextDark: {
    color: colors.inkOnDarkSoft
  },
  previewOrbLarge: {
    position: "absolute",
    right: -16,
    top: -10,
    width: 124,
    height: 124,
    borderRadius: radius.pill,
    backgroundColor: "#dcdfff"
  },
  previewOrbLargeDark: {
    backgroundColor: "rgba(123,104,255,0.42)"
  },
  previewOrbSmall: {
    position: "absolute",
    left: 22,
    bottom: -26,
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    backgroundColor: "#cfe6ff"
  },
  previewOrbSmallDark: {
    backgroundColor: "rgba(255,255,255,0.12)"
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
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.display
  },
  titleDark: {
    color: colors.inkOnDark
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  subtitleDark: {
    color: colors.inkOnDarkSoft
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pageStrong,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill
  },
  metaBadgeDark: {
    backgroundColor: colors.glass
  },
  metaText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800"
  },
  metaTextDark: {
    color: colors.inkOnDark
  },
  fitSummary: {
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.panelMuted,
    gap: 8
  },
  fitSummaryDark: {
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  fitSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  fitSummaryTitle: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  fitSummaryTitleDark: {
    color: colors.inkOnDarkSoft
  },
  fitSummarySize: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  fitSummarySizeDark: {
    color: colors.inkOnDark
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  warning: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18
  },
  warningDark: {
    color: "#ffcf7d"
  },
  highlight: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19
  },
  highlightDark: {
    color: colors.inkOnDark
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
