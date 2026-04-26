import { useEffect, useMemo, useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ProductCard } from "../../components/ProductCard";
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
  const sceneLabel = String(data?.result?.metadata?.sceneVibe ?? "Cyberpunk");
  const isPending = data?.status === "QUEUED" || data?.status === "PROCESSING";
  const fallbackIssues = useMemo(() => {
    if (!data) {
      return [];
    }
    if (data.status === "FAILED") {
      return ["Generation did not finish cleanly, so this output should not drive a final purchase decision yet."];
    }
    if (isPending) {
      return ["The request is still processing, so fit interpretation is provisional until the render completes."];
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
        <ErrorState title="Try-on result" message="The latest try-on result could not be loaded." actionLabel="Try-On" onRetry={() => router.push("/try-on")} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen tone="dark">
        <EmptyState title="No try-on request yet" message="Start from the try-on tab to create a queued request." actionLabel="Go to try-on" onAction={() => router.push("/try-on")} />
      </Screen>
    );
  }

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="Generation"
        title="Look cooking"
        subtitle="The loading quote, compare view, save action, and explanation live on one result surface."
      >
        <View style={styles.progressCard}>
          <View style={styles.loadingLineTrack}>
            <View style={styles.loadingLineBar} />
          </View>
          <Text style={styles.progressTitle}>{loadingQuotes[quoteIndex]}</Text>
          <Text style={styles.progressBody}>
            {data.statusMessage ??
              "Blending your portrait, garment silhouette, scene vibe, and fit profile into a reusable result."}
          </Text>
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.previewCard}>
            {data.sourceUpload?.publicUrl ? <Image source={{ uri: data.sourceUpload.publicUrl }} style={styles.previewImage} /> : null}
            <Text style={styles.previewLabel}>Original</Text>
          </View>
          <View style={styles.previewCard}>
            {data.result?.outputImageUrl ? <Image source={{ uri: data.result.outputImageUrl }} style={styles.previewImage} /> : null}
            <Text style={styles.previewLabel}>AI try-on</Text>
          </View>
        </View>

        <View style={styles.chips}>
          <Pill label="Saved-fit ready" tone="success" />
          <Pill label={`Scene: ${sceneLabel}`} tone="accent" />
          <Pill label="Downloadable" tone="neutral" />
        </View>

        <View style={styles.explainPanel}>
          <Text style={styles.explainTitle}>AI explanation</Text>
          <Text style={styles.explainBody}>
            {data.result?.summary ??
              "This result should explain confidence, garment fit, color match, and the next best products to continue shopping."}
          </Text>
        </View>

        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={saveLook} disabled={data.status !== "COMPLETED"}>
            Save to wardrobe
          </PrimaryButton>
          <PrimaryButton onPress={downloadLook} variant="secondary" disabled={!data.result?.outputImageUrl}>
            Download
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard
        tone="dark"
        eyebrow="Fit Result"
        title="Confidence, fit, and issues"
        subtitle="The visual output is still backed by fit interpretation and recommendation follow-through."
      >
        <View style={styles.metrics}>
          <MetricTile label="Visual" value={`${Math.round(visualConfidence * 100)}%`} caption="Generation quality" />
          <MetricTile label="Fit" value={fitResult?.fitLabel ?? "regular"} caption={fitResult?.recommendedSize ? `Size ${fitResult.recommendedSize}` : "Profile read"} />
          <MetricTile label="Confidence" value={`${Math.round(fitConfidence * 100)}%`} caption="Fit confidence" />
        </View>

        <View style={styles.chips}>
          <Pill label={`${fitResult?.fitLabel ?? "regular"} fit`} tone={fitTone(fitResult?.fitLabel)} />
          <Pill label={`${Math.round(fitConfidence * 100)}% fit confidence`} tone={confidenceTone(fitConfidence)} />
          <Pill label={`${Math.round(visualConfidence * 100)}% visual`} tone={confidenceTone(visualConfidence)} />
        </View>

        <Text style={styles.explainBody}>
          {fitResult?.explanation ??
            "Fit guidance will strengthen once both profile measurements and product size-chart coverage are available."}
        </Text>

        <View style={styles.issueStack}>
          {(fitResult?.issues?.length ? fitResult.issues : []).slice(0, 3).map((issue) => (
            <Pill key={issue.code} label={issue.message} tone={issueTone(issue)} />
          ))}
          {!fitResult?.issues?.length
            ? fallbackIssues.map((issue) => <Text key={issue} style={styles.fallbackIssue}>{issue}</Text>)
            : null}
        </View>
      </SectionCard>

      <SectionCard
        tone="dark"
        eyebrow="Shopping"
        title="Complete the look"
        subtitle="Recommendations are tied directly to the generated result so the shopping handoff feels native."
      >
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <ProductCard
              key={recommendation.id ?? recommendation.productId}
              tone="dark"
              title={recommendation.product?.name ?? recommendation.productId}
              subtitle={recommendation.product?.category ?? "Recommendation"}
              badge={(recommendation.rankingBadges ?? [])[0] ?? "Scene-matched"}
              scoreLabel={`Score ${Math.round(recommendation.score)}`}
              highlight={recommendation.explanation ?? "Recommendation derived from the current try-on result."}
              fitLabel={recommendation.bestFitLabel}
              confidenceLabel={recommendation.fitResult ? `${Math.round(recommendation.fitResult.confidenceScore * 100)}% confidence` : null}
              bestSizeLabel={recommendation.bestSizeLabel}
              contextTags={recommendation.reasonTags}
              rankingBadges={recommendation.rankingBadges}
              priceLabel={recommendation.offerSummary?.lowestPrice != null ? `$${Math.round(recommendation.offerSummary.lowestPrice)}` : null}
              primaryLabel="Open retailer"
              onPrimaryPress={() => router.push("/retail")}
              secondaryLabel="Save products"
              onSecondaryPress={() => router.push("/saved")}
            />
          ))
        ) : (
          <EmptyState title="No linked recommendations yet" message="Recommendation cards will appear once this try-on result can be matched against the current catalog." actionLabel="Back to feed" onAction={() => router.push("/feed")} />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 10
  },
  loadingLineTrack: {
    height: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  loadingLineBar: {
    width: "38%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.accent
  },
  progressTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800"
  },
  progressBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  previewGrid: {
    flexDirection: "row",
    gap: 10
  },
  previewCard: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    minHeight: 138
  },
  previewImage: {
    width: "100%",
    height: 116
  },
  previewLabel: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  explainPanel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 6
  },
  explainTitle: {
    color: colors.inkOnDark,
    fontSize: 14.5,
    fontWeight: "800"
  },
  explainBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  message: {
    color: colors.inkOnDark,
    fontSize: 12,
    lineHeight: 18
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  issueStack: {
    gap: 8
  },
  fallbackIssue: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  }
});
