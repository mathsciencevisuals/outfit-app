import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { ProductCard, productSubtitle } from "../../components/ProductCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { FitIssue, FitResult, Recommendation, TryOnRequest } from "../../types/api";

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
  }, [requestId]);

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

  const shareLook = async () => {
    if (!data) {
      return;
    }
    await mobileApi.shareLook({ tryOnRequestId: data.id, channel: "share_sheet" });
    setActionMessage("Share event captured");
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Try-on result" subtitle="Polling the latest try-on state from the queue." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="Try-on result"
          message="The latest try-on result could not be loaded."
          actionLabel="Upload another photo"
          onRetry={() => router.push("/tryon-upload")}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState
          title="No try-on request yet"
          message="Start from the upload screen to create a queued try-on request."
          actionLabel="Go to upload"
          onAction={() => router.push("/tryon-upload")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Look"
        title={data.variant?.product?.name ?? "Latest try-on preview"}
        subtitle="Review the generated look and the structured fit guidance together before you buy."
      >
        <View style={styles.row}>
          <Pill
            label={data.status}
            tone={data.status === "COMPLETED" ? "success" : data.status === "FAILED" ? "danger" : "info"}
          />
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
        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}
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
          <Pill
            label={`${Math.round((fitResult?.measurementProfile?.completenessScore ?? 0) * 100)}% profile complete`}
            tone={(fitResult?.measurementProfile?.completenessScore ?? 0) >= 0.75 ? "success" : "warning"}
          />
        </View>
        <Text style={styles.summaryText}>
          {fitResult?.measurementProfile?.guidance ??
            "This guidance combines your saved body measurements with the selected product size chart."}
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

      <SectionCard eyebrow="Alternatives" title="Other sizes worth trying">
        {fitResult?.alternatives?.length ? (
          <View style={styles.altList}>
            {fitResult.alternatives.map((alternative) => (
              <View key={alternative.sizeLabel} style={styles.altCard}>
                <View style={styles.altHeader}>
                  <Text style={styles.altSize}>{alternative.sizeLabel}</Text>
                  <Pill label={`${Math.round(alternative.fitScore)} fit score`} tone="info" />
                </View>
                <Text style={styles.summaryText}>{alternative.reason}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.summaryText}>No strong alternative sizes surfaced beyond the current recommendation.</Text>
        )}
      </SectionCard>

      <SectionCard eyebrow="Complete The Look" title="Style and commerce next steps">
        {recommendations.length > 0 ? (
          recommendations.map((item) => (
            <ProductCard
              key={item.productId}
              title={item.product?.name ?? item.productId}
              subtitle={productSubtitle(item.product)}
              badge={(item.rankingBadges ?? [])[0] ?? "Recommended"}
              highlight={item.explanation}
              bestSizeLabel={item.bestSizeLabel}
              fitLabel={item.bestFitLabel}
              confidenceLabel={item.fitResult ? `${Math.round(item.fitResult.confidenceScore * 100)}% confidence` : null}
              contextTags={[...(item.reasonTags ?? []), ...(item.occasionTags ?? [])]}
              rankingBadges={item.rankingBadges}
              priceLabel={item.offerSummary?.lowestPrice != null ? `From $${Math.round(item.offerSummary.lowestPrice)}` : item.budgetLabel ?? null}
              primaryLabel="Compare shops"
              onPrimaryPress={() => router.push("/shops")}
              secondaryLabel="Recommendations"
              onSecondaryPress={() => router.push("/recommendations")}
            />
          ))
        ) : (
          <Text style={styles.summaryText}>Complementary styling recommendations will appear once product and profile signals are available together.</Text>
        )}
      </SectionCard>

      <SectionCard eyebrow="Actions" title="Save, share, and compare">
        <PrimaryButton onPress={saveLook}>Save look</PrimaryButton>
        <PrimaryButton onPress={shareLook} variant="secondary">
          Share look
        </PrimaryButton>
        <PrimaryButton onPress={() => router.push("/recommendations")} variant="secondary">
          See alternatives
        </PrimaryButton>
        <PrimaryButton onPress={() => router.push("/shops")} variant="ghost">
          Compare buy options
        </PrimaryButton>
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
    gap: 12
  },
  compareCard: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#f6efe5",
    borderWidth: 1,
    borderColor: "#e6d7c0",
    padding: 12,
    gap: 8
  },
  compareImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    backgroundColor: "#eadcc7"
  },
  compareLabel: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700"
  },
  fitHero: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#f9f3eb",
    borderWidth: 1,
    borderColor: "#eadcc7",
    gap: 12
  },
  fitHeroCopy: {
    gap: 6
  },
  fitHeroEyebrow: {
    color: "#836d53",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  fitHeroSize: {
    color: "#172033",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800"
  },
  fitHeroText: {
    color: "#536075",
    fontSize: 15,
    lineHeight: 22
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
  summaryText: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  },
  alertCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#fff6eb",
    borderWidth: 1,
    borderColor: "#efcf9f",
    gap: 4
  },
  alertTitle: {
    color: "#8a4f12",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  warningText: {
    color: "#8a4f12",
    fontSize: 14,
    lineHeight: 20
  },
  issueList: {
    gap: 10
  },
  issueCard: {
    borderRadius: 18,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 14,
    gap: 8
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  issueTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "700"
  },
  issueRow: {
    borderRadius: 18,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 14
  },
  issueText: {
    color: "#5f697d",
    fontSize: 14,
    lineHeight: 21
  },
  altList: {
    gap: 10
  },
  altCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "#d4dfec",
    gap: 8
  },
  altHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  altSize: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700"
  },
  message: {
    color: "#5f697d",
    fontSize: 14
  }
});
