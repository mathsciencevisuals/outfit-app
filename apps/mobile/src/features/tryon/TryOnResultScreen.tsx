import { useEffect, useMemo, useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
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
import { colors, fonts, radius } from "../../theme/design";
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
        setLoading(false);

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

        if (nextRequest.status === "QUEUED" || nextRequest.status === "PROCESSING") {
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

    setLoading(true);
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
  const fallbackIssues = useMemo(() => {
    if (!data) {
      return [];
    }
    if (data.status === "FAILED") {
      return ["Generation did not finish cleanly, so this preview should not be used for buying decisions yet."];
    }
    if (data.status === "QUEUED" || data.status === "PROCESSING") {
      return ["The request is still running, so the fit interpretation is provisional until processing completes."];
    }
    return ["No major structured fit issues surfaced for the recommended size."];
  }, [data]);

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

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Try-on result" subtitle={loadingQuotes[quoteIndex]} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Try-on result" message="The latest try-on result could not be loaded." actionLabel="Upload another photo" onRetry={() => router.push("/try-on")} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState title="No try-on request yet" message="Start from the try-on tab to create a queued request." actionLabel="Go to upload" onAction={() => router.push("/try-on")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Result"
        title={data.variant?.product?.name ?? "Latest try-on preview"}
        subtitle="Review the generated look, fit read, and wardrobe actions together before you buy."
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
          <View style={styles.compareCard}>
            {data.result?.outputImageUrl ? <Image source={{ uri: data.result.outputImageUrl }} style={styles.compareImage} /> : null}
            <Text style={styles.compareLabel}>AI try-on</Text>
          </View>
        </View>
        {data.status !== "COMPLETED" ? (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>Loading note</Text>
            <Text style={styles.quoteText}>{loadingQuotes[quoteIndex]}</Text>
          </View>
        ) : null}
        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}
        <View style={styles.actionRow}>
          <PrimaryButton onPress={saveLook} disabled={data.status !== "COMPLETED"}>
            Save to wardrobe
          </PrimaryButton>
          <PrimaryButton onPress={downloadLook} variant="secondary" disabled={!data.result?.outputImageUrl}>
            Download image
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Fit" title="Recommended size and fit read">
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
          recommendations.map((item) => (
            <ProductCard
              key={item.id ?? item.productId}
              title={item.product?.name ?? item.productId}
              subtitle={`${item.product?.brand?.name ?? "Brand"} · ${item.product?.category ?? "category"} · ${item.product?.baseColor ?? "color"}`}
              badge="Suggested next"
              highlight={item.explanation ?? "Recommended from the current try-on result."}
              bestSizeLabel={item.bestSizeLabel}
              fitLabel={item.bestFitLabel}
              confidenceLabel={item.fitResult ? `${Math.round(item.fitResult.confidenceScore * 100)}% confidence` : null}
              contextTags={item.occasionTags}
              rankingBadges={item.rankingBadges}
              priceLabel={item.offerSummary?.lowestPrice != null ? `From $${Math.round(item.offerSummary.lowestPrice)}` : null}
              primaryLabel="Compare shops"
              onPrimaryPress={() => router.push("/retail")}
              secondaryLabel="Try on again"
              onSecondaryPress={() => router.push("/try-on")}
            />
          ))
        ) : (
          <Text style={styles.summaryText}>No related recommendation cards are available for this result yet.</Text>
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
  actionRow: {
    gap: 10
  },
  compareRow: {
    flexDirection: "row",
    gap: 12
  },
  compareCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line
  },
  compareImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.pageStrong
  },
  compareLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  quoteCard: {
    borderRadius: radius.lg,
    backgroundColor: "#f7efe4",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6
  },
  quoteLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  quoteText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.display
  },
  message: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 21
  },
  fitHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  fitHeroCopy: {
    flex: 1,
    gap: 6
  },
  fitHeroEyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  fitHeroSize: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 38,
    fontFamily: fonts.display
  },
  fitHeroText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  fitHeroBadges: {
    gap: 8,
    alignItems: "flex-end"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  alertCard: {
    borderRadius: radius.lg,
    backgroundColor: "#f8ead6",
    borderWidth: 1,
    borderColor: "#efcf9f",
    padding: 14,
    gap: 6
  },
  alertTitle: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: "700"
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 20
  },
  summaryText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  issueList: {
    gap: 10
  },
  issueCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    backgroundColor: "#fcf8f2"
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  issueTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  issueText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20
  },
  issueRow: {
    paddingVertical: 6
  }
});
