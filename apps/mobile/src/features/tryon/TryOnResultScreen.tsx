import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { InfoRow } from "../../components/InfoRow";
import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { ProductCard } from "../../components/ProductCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { FitIssue, FitResult, Recommendation, TryOnRequest } from "../../types/api";

const loadingQuotes = [
  "Consulting the fashion gods...",
  "Manifesting the drip...",
  "Serving pixels, not crumbs...",
  "Aligning your aura with the outfit...",
  "Rendering main-character energy..."
];

function confidenceTone(confidence?: number) {
  if (!confidence) {
    return "warning" as const;
  }
  if (confidence >= 0.85) {
    return "success" as const;
  }
  if (confidence >= 0.7) {
    return "info" as const;
  }
  return "warning" as const;
}

function fitTone(fitLabel?: string | null) {
  if (fitLabel === "slim") {
    return "accent" as const;
  }
  if (fitLabel === "relaxed") {
    return "info" as const;
  }
  return "neutral" as const;
}

function issueTone(issue: FitIssue) {
  if (issue.severity === "high") {
    return "danger" as const;
  }
  if (issue.severity === "medium") {
    return "warning" as const;
  }
  return "info" as const;
}

function issueTitle(issue: FitIssue) {
  return issue.code
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TryOnResultScreen() {
  const router = useRouter();
  const requestId = useAppStore((state) => state.lastTryOnRequestId);
  const userId = useAppStore((state) => state.userId);
  const [data, setData] = useState<TryOnRequest | null>(null);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(Boolean(requestId));
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timer = setInterval(() => {
      setQuoteIndex((current) => (current + 1) % loadingQuotes.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      setData(null);
      return;
    }

    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const nextRequest = await mobileApi.tryOnResult(requestId);
        if (!mounted) {
          return;
        }

        setData(nextRequest);
        setError(null);

        const isPending = nextRequest.status === "QUEUED" || nextRequest.status === "PROCESSING";
        setLoading(isPending);

        if (nextRequest.variant?.product?.id) {
          const [preview, nextRecommendations] = await Promise.all([
            mobileApi.productFitPreview(nextRequest.variant.product.id, {
              variantId: nextRequest.variant.id,
              chosenSizeLabel: nextRequest.variant.sizeLabel
            }),
            mobileApi.recommendations(userId, { productId: nextRequest.variant.product.id })
          ]);
          if (mounted) {
            setFitResult(preview);
            setRecommendations(nextRecommendations.slice(0, 3));
          }
        }

        if (isPending) {
          timeoutId = setTimeout(load, 2500);
        }
      } catch (nextError: unknown) {
        if (!mounted) {
          return;
        }

        setLoading(false);
        setError(nextError instanceof Error ? nextError.message : "Failed to load result.");
      }
    };

    void load();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [requestId, userId]);

  const visualConfidence = data?.result?.confidence ?? 0;
  const fitConfidence = fitResult?.confidenceScore ?? 0;
  const isPending = data?.status === "QUEUED" || data?.status === "PROCESSING";
  const fallbackIssues = useMemo(() => {
    if (!data) {
      return [];
    }
    if (data.status === "FAILED") {
      return ["Generation did not finish cleanly, so this preview should not be used for buying decisions yet."];
    }
    if (isPending) {
      return ["The request is still running, so the fit interpretation is provisional until processing completes."];
    }
    return ["No major structured fit issues surfaced for the recommended size."];
  }, [data, isPending]);

  const saveLook = async () => {
    if (!data?.variant?.product?.id) {
      return;
    }
    const saved = await mobileApi.saveLook(userId, {
      name: data.comparisonLabel ?? `${data.variant.product.name} look`,
      note: data.result?.summary ?? "Saved from try-on result",
      productIds: [data.variant.product.id],
      isWishlist: false
    });
    setActionMessage(`Saved ${saved.name}`);
  };

  const downloadLook = async () => {
    if (!data?.result?.outputImageUrl) {
      return;
    }

    await Linking.openURL(data.result.outputImageUrl);
    setActionMessage("Opened the generated image for download.");
  };

  const shareLook = async () => {
    if (!data?.id) {
      return;
    }

    await mobileApi.shareLook({ tryOnRequestId: data.id, channel: "native-share" });
    setActionMessage("Share event logged.");
  };

  if (loading && !data) {
    return (
      <Screen tone="dark">
        <LoadingState title="Try-on result" subtitle={loadingQuotes[quoteIndex]} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark">
        <ErrorState title="Try-on result" message="The latest try-on result could not be loaded." actionLabel="Upload another photo" onRetry={() => router.push("/try-on")} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen tone="dark">
        <EmptyState title="No try-on request yet" message="Start from the try-on tab to create a queued request." actionLabel="Go to upload" onAction={() => router.push("/try-on")} />
      </Screen>
    );
  }

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="Result"
        title={data.variant?.product?.name ?? "Latest try-on preview"}
        subtitle="Keep loading, result actions, and fit interpretation on a single surface instead of splitting them into separate states."
      >
        <View style={styles.row}>
          <Pill label={data.status} tone={data.status === "COMPLETED" ? "success" : data.status === "FAILED" ? "danger" : "info"} />
          <Pill label={data.fitStyle ?? "balanced"} tone="neutral" />
          <Pill label={`${Math.round(visualConfidence * 100)}% visual confidence`} tone={confidenceTone(visualConfidence)} />
        </View>

        <View style={styles.compareRow}>
          <View style={styles.compareCard}>
            {data.sourceUpload?.publicUrl ? <Image source={{ uri: data.sourceUpload.publicUrl }} style={styles.compareImage} /> : null}
            <Text style={styles.compareLabel}>Original</Text>
          </View>
          <View style={[styles.compareCard, styles.compareCardAccent]}>
            {data.result?.outputImageUrl ? <Image source={{ uri: data.result.outputImageUrl }} style={styles.compareImage} /> : null}
            <Text style={styles.compareLabel}>AI try-on</Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.progressCard}>
            <View style={styles.progressOrb} />
            <Text style={styles.progressLabel}>Generation in motion</Text>
            <Text style={styles.progressQuote}>{loadingQuotes[quoteIndex]}</Text>
            <Text style={styles.progressText}>{data.statusMessage ?? "Your request is queued and will refresh automatically."}</Text>
          </View>
        ) : null}

        {data.status === "FAILED" ? (
          <View style={styles.failedCard}>
            <Text style={styles.failedTitle}>Generation failed</Text>
            <Text style={styles.failedText}>{data.statusMessage ?? "The request did not complete cleanly."}</Text>
            <PrimaryButton onPress={() => router.push("/try-on")} variant="secondary" fullWidth={false}>
              Try again
            </PrimaryButton>
          </View>
        ) : null}

        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}

        <View style={styles.actionGrid}>
          <PrimaryButton onPress={saveLook} disabled={data.status !== "COMPLETED"}>
            Save to wardrobe
          </PrimaryButton>
          <PrimaryButton onPress={downloadLook} variant="secondary" disabled={!data.result?.outputImageUrl}>
            Download image
          </PrimaryButton>
        </View>
        <View style={styles.actionGrid}>
          <PrimaryButton onPress={shareLook} variant="secondary" disabled={data.status !== "COMPLETED"}>
            Share look
          </PrimaryButton>
          <PrimaryButton onPress={() => router.push("/retail")} variant="ghost">
            Shop this fit
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Fit" title="Recommended size and fit read" subtitle="Fit and visual confidence remain readable even while the render is richer.">
        <View style={styles.fitHero}>
          <View style={styles.fitHeroCopy}>
            <Text style={styles.fitHeroEyebrow}>Recommended size</Text>
            <Text style={styles.fitHeroSize}>{fitResult?.recommendedSize ?? data.variant?.sizeLabel ?? "--"}</Text>
            <Text style={styles.fitHeroText}>
              {fitResult?.explanation ?? "Fit guidance will strengthen once measurement and size-chart data are both available."}
            </Text>
          </View>
          <View style={styles.fitHeroBadges}>
            <Pill label={`${fitResult?.fitLabel ?? "regular"} fit`} tone={fitTone(fitResult?.fitLabel)} />
            <Pill label={`${Math.round(fitConfidence * 100)}% fit confidence`} tone={confidenceTone(fitConfidence)} />
          </View>
        </View>

        <View style={styles.metricRow}>
          <MetricTile label="Selected" value={data.variant?.sizeLabel ?? "--"} caption="Current try-on size" />
          <MetricTile label="Fit score" value={`${Math.round(fitResult?.fitScore ?? 0)}`} caption="Relative suitability" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Visual confidence" value={`${Math.round(visualConfidence * 100)}%`} caption="Generation quality signal" />
          <MetricTile label="Fit label" value={fitResult?.fitLabel ?? "regular"} caption="Likely silhouette" />
        </View>

        {fitResult?.recommendedSize && fitResult.recommendedSize !== data.variant?.sizeLabel ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Selected size differs</Text>
            <Text style={styles.warningText}>
              The render used {data.variant?.sizeLabel ?? "--"}, but the fit engine prefers {fitResult.recommendedSize}.
            </Text>
          </View>
        ) : null}

        <InfoRow label="Selected color" value={String(data.result?.metadata?.selectedColor ?? data.variant?.color ?? "Catalog")} />
        <InfoRow label="Fit style" value={String(data.result?.metadata?.fitStyle ?? data.fitStyle ?? "balanced")} />
      </SectionCard>

      <SectionCard eyebrow="Confidence" title="How strong this guidance is">
        <View style={styles.row}>
          <Pill label={`${Math.round(visualConfidence * 100)}% visual`} tone={confidenceTone(visualConfidence)} />
          <Pill label={`${Math.round(fitConfidence * 100)}% fit`} tone={confidenceTone(fitConfidence)} />
          <Pill label={`${Math.round((fitResult?.measurementProfile?.completenessScore ?? 0) * 100)}% profile complete`} tone={(fitResult?.measurementProfile?.completenessScore ?? 0) >= 0.75 ? "success" : "warning"} />
        </View>
        <Text style={styles.summaryText}>
          {fitResult?.measurementProfile?.guidance ?? "This guidance combines your saved body measurements with the selected product size chart."}
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Potential Issues" title="What to watch">
        {fitResult?.issues?.length ? (
          <View style={styles.issueList}>
            {fitResult.issues.map((issue) => (
              <View key={issue.code} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <Text style={styles.issueTitle}>{issueTitle(issue)}</Text>
                  <Pill label={issue.severity} tone={issueTone(issue)} />
                </View>
                <Text style={styles.issueText}>{issue.message}</Text>
              </View>
            ))}
          </View>
        ) : (
          fallbackIssues.map((issue) => (
            <View key={issue} style={styles.issueRow}>
              <Text style={styles.issueText}>{issue}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard eyebrow="Complete The Look" title="Style and commerce next steps">
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <ProductCard
              key={recommendation.id ?? recommendation.productId}
              title={recommendation.product?.name ?? recommendation.productId}
              subtitle={recommendation.product?.category ?? "Recommendation"}
              badge={(recommendation.rankingBadges ?? [])[0] ?? "Next step"}
              scoreLabel={`Score ${Math.round(recommendation.score)}`}
              highlight={recommendation.explanation ?? "Recommended from the current try-on result."}
              bestSizeLabel={recommendation.bestSizeLabel}
              fitLabel={recommendation.bestFitLabel}
              confidenceLabel={recommendation.fitResult ? `${Math.round(recommendation.fitResult.confidenceScore * 100)}% confidence` : null}
              contextTags={recommendation.reasonTags}
              rankingBadges={recommendation.rankingBadges}
              priceLabel={recommendation.offerSummary?.lowestPrice != null ? `From $${Math.round(recommendation.offerSummary.lowestPrice)}` : null}
              primaryLabel="Compare shops"
              onPrimaryPress={() => router.push("/retail")}
              secondaryLabel="Try another vibe"
              onSecondaryPress={() => router.push("/try-on")}
            />
          ))
        ) : (
          <EmptyState title="No linked recommendations yet" message="Recommendation cards will appear once the catalog and fit signals overlap more strongly." actionLabel="Back to feed" onAction={() => router.push("/feed")} />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  compareRow: {
    flexDirection: "row",
    gap: 10
  },
  compareCard: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark,
    minHeight: 214
  },
  compareCardAccent: {
    backgroundColor: "rgba(99,91,255,0.18)"
  },
  compareImage: {
    width: "100%",
    height: 180
  },
  compareLabel: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  progressCard: {
    position: "relative",
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    overflow: "hidden",
    gap: 6
  },
  progressOrb: {
    position: "absolute",
    right: -20,
    top: -12,
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    backgroundColor: colors.heroGlow
  },
  progressLabel: {
    color: colors.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  progressQuote: {
    color: colors.inkOnDark,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700"
  },
  progressText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: "90%"
  },
  failedCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(213,91,103,0.14)",
    borderWidth: 1,
    borderColor: "rgba(213,91,103,0.26)",
    gap: 10
  },
  failedTitle: {
    color: "#ffd5dc",
    fontSize: 14,
    fontWeight: "800"
  },
  failedText: {
    color: "#ffcad2",
    fontSize: 12,
    lineHeight: 18
  },
  message: {
    color: colors.inkOnDark,
    fontSize: 12,
    lineHeight: 18
  },
  actionGrid: {
    gap: 10
  },
  fitHero: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.panelMuted,
    gap: 10
  },
  fitHeroCopy: {
    gap: 4
  },
  fitHeroEyebrow: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  fitHeroSize: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700"
  },
  fitHeroText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  fitHeroBadges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  alertCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(217,139,25,0.18)",
    gap: 4
  },
  alertTitle: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800"
  },
  warningText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18
  },
  summaryText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  issueList: {
    gap: 10
  },
  issueCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center"
  },
  issueTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  issueText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  issueRow: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.panelMuted
  }
});
