import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState, LoadingState } from "../../components/StateCard";
import { ProductCard } from "../../components/ProductCard";
import { Screen } from "../../components/Screen";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { FitResult, Recommendation, TryOnRequest } from "../../types/api";
import { demoData } from "../../demo/demo-data";
import { demoModeEnabled } from "../../utils/env";

const loadingQuotes = [
  "Consulting the fashion gods...",
  "Manifesting the drip...",
  "Rendering main-character energy..."
];

function confidenceColor(confidence?: number) {
  if (!confidence) {
    return colors.warning;
  }
  if (confidence >= 0.85) {
    return colors.success;
  }
  if (confidence >= 0.7) {
    return colors.info;
  }
  return colors.warning;
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

  const isPending = data?.status === "QUEUED" || data?.status === "PROCESSING" || (!data && loading);
  const originalImage = data?.sourceUpload?.publicUrl ?? data?.imageUrl ?? demoData.tryOnRequest.sourceUpload?.publicUrl ?? null;
  const fallbackResultImage = demoModeEnabled ? demoData.tryOnRequest.result?.outputImageUrl ?? null : null;
  const resultImage = data?.result?.outputImageUrl ?? fallbackResultImage;
  const sceneLabel = String(data?.result?.metadata?.sceneVibe ?? "Cyberpunk City");
  const fitStyle = String(data?.result?.metadata?.fitStyle ?? data?.fitStyle ?? "balanced");
  const providerLabel = data?.provider ?? (demoModeEnabled ? "demo-mode" : "mock");
  const statusLabel = data?.status ?? "PROCESSING";
  const visualConfidence = data?.result?.confidence ?? (demoModeEnabled ? demoData.tryOnRequest.result?.confidence ?? 0 : 0);

  const retryLoad = () => {
    setError(null);
    setLoading(Boolean(requestId));
    if (requestId) {
      setData(null);
    }
  };

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

  const downloadOrShareLook = async () => {
    if (!resultImage) {
      return;
    }

    await Linking.openURL(resultImage);
    setActionMessage("Opened the generated look for download or sharing.");
  };

  const fitSummary = useMemo(() => {
    if (fitResult?.issues?.length) {
      return fitResult.issues.slice(0, 3).map((issue) => issue.message);
    }

    if (data?.status === "FAILED") {
      return ["Generation failed before a stable result image was returned."];
    }

    return ["No major fit issues surfaced for the recommended size."];
  }, [data?.status, fitResult?.issues]);

  if (!requestId && !loading) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <EmptyState
          title="No try-on request yet"
          message="Start from the try-on tab to create a queued request."
          actionLabel="Go to try-on"
          onAction={() => router.push("/try-on")}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <View style={styles.errorShell}>
          <Text style={styles.errorEyebrow}>Try-On Result</Text>
          <Text style={styles.errorTitle}>Result could not load</Text>
          <Text style={styles.errorBody}>
            {error}
          </Text>
          <View style={styles.buttonRow}>
            <ActionButton label="Try again" icon="refresh-cw" onPress={retryLoad} />
            <ActionButton label="Back to Feed" icon="home" variant="secondary" onPress={() => router.push("/feed")} />
          </View>
        </View>
      </Screen>
    );
  }

  if (loading && !data) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <LoadingState title="Try-on result" subtitle={loadingQuotes[quoteIndex]} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <EmptyState
          title="No try-on result"
          message="The request exists, but no result payload is available yet."
          actionLabel="Back to feed"
          onAction={() => router.push("/feed")}
        />
      </Screen>
    );
  }

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Generation</Text>
          <Text style={styles.title}>{isPending ? "Look cooking" : "Your result"}</Text>
          <Text style={styles.subtitle}>
            {isPending
              ? "Useful loading language and compare-ready output in one result surface."
              : "Original image, AI result, fit metadata, and shopping continuation in one place."}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.loadingTrack}>
            <View
              style={[
                styles.loadingBar,
                {
                  width: quoteIndex === 0 ? "28%" : quoteIndex === 1 ? "62%" : "88%"
                }
              ]}
            />
          </View>
          <Text style={styles.progressTitle}>{loadingQuotes[quoteIndex]}</Text>
          <Text style={styles.progressBody}>
            {data.statusMessage ??
              "Blending your portrait, garment silhouette, scene vibe, and fit profile into a reusable result."}
          </Text>
        </View>

        <View style={styles.compareGrid}>
          <PreviewCard title="Original" imageUri={originalImage} />
          <PreviewCard title="AI Try-On" imageUri={resultImage} />
        </View>

        <View style={styles.metaPanel}>
          <View style={styles.metaRow}>
            <InfoChip label={`Scene: ${sceneLabel}`} tone="accent" />
            <InfoChip label={`Fit style: ${fitStyle}`} tone="neutral" />
          </View>
          <View style={styles.metaRow}>
            <InfoChip label={`Confidence: ${Math.round(visualConfidence * 100)}%`} tone="success" />
            <InfoChip label={`Provider: ${providerLabel}`} tone="dark" />
            <InfoChip label={`Status: ${statusLabel}`} tone={data.status === "FAILED" ? "warning" : "dark"} />
          </View>
          <Text style={styles.summaryBody}>
            {data.result?.summary ??
              "This result should explain confidence, garment fit, color match, and the next best products to continue shopping."}
          </Text>
        </View>

        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}

        <View style={styles.buttonRow}>
          <ActionButton label="Save to wardrobe" icon="heart" onPress={saveLook} disabled={data.status !== "COMPLETED"} />
          <ActionButton
            label="Download / share"
            icon="share-2"
            variant="secondary"
            onPress={downloadOrShareLook}
            disabled={!resultImage}
          />
          <ActionButton label="Shop similar" icon="shopping-bag" variant="secondary" onPress={() => router.push("/retail")} />
        </View>

        <View style={styles.fitPanel}>
          <Text style={styles.panelTitle}>Fit snapshot</Text>
          <View style={styles.metrics}>
            <MetricCard label="Recommended size" value={fitResult?.recommendedSize ?? data.variant?.sizeLabel ?? "--"} />
            <MetricCard label="Fit label" value={fitResult?.fitLabel ?? "regular"} />
            <MetricCard
              label="Fit confidence"
              value={`${Math.round((fitResult?.confidenceScore ?? visualConfidence) * 100)}%`}
              accentColor={confidenceColor(fitResult?.confidenceScore ?? visualConfidence)}
            />
          </View>
          <Text style={styles.fitBody}>
            {fitResult?.explanation ??
              "Fit guidance will strengthen once both profile measurements and product size-chart coverage are available."}
          </Text>
          <View style={styles.issueRow}>
            {fitSummary.map((issue) => (
              <View key={issue} style={styles.issueChip}>
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.recommendationsPanel}>
          <Text style={styles.panelTitle}>Shop similar</Text>
          <Text style={styles.panelSubtitle}>
            Product recommendations stay attached to the generated result so the commerce handoff feels native.
          </Text>
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
                confidenceLabel={
                  recommendation.fitResult ? `${Math.round(recommendation.fitResult.confidenceScore * 100)}% confidence` : null
                }
                bestSizeLabel={recommendation.bestSizeLabel}
                contextTags={recommendation.reasonTags}
                rankingBadges={recommendation.rankingBadges}
                priceLabel={
                  recommendation.offerSummary?.lowestPrice != null
                    ? `Rs. ${Math.round(recommendation.offerSummary.lowestPrice)}`
                    : null
                }
                primaryLabel="Open retailer"
                onPrimaryPress={() => router.push("/retail")}
                secondaryLabel="Save products"
                onSecondaryPress={() => router.push("/saved")}
              />
            ))
          ) : (
            <EmptyState
              title="No linked recommendations yet"
              message="Recommendation cards will appear once this try-on result can be matched against the current catalog."
              actionLabel="Back to feed"
              onAction={() => router.push("/feed")}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function PreviewCard({ title, imageUri }: { title: string; imageUri: string | null }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewLabel}>{title}</Text>
      <View style={styles.previewFrame}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <Text style={styles.previewEmpty}>Image pending</Text>}
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  accentColor
}: {
  label: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accentColor ? { color: accentColor } : null]}>{value}</Text>
    </View>
  );
}

function InfoChip({
  label,
  tone
}: {
  label: string;
  tone: "accent" | "success" | "neutral" | "dark" | "warning";
}) {
  return (
    <View
      style={[
        styles.infoChip,
        tone === "accent" && styles.infoChipAccent,
        tone === "success" && styles.infoChipSuccess,
        tone === "neutral" && styles.infoChipNeutral,
        tone === "dark" && styles.infoChipDark,
        tone === "warning" && styles.infoChipWarning
      ]}
    >
      <Text
        style={[
          styles.infoChipText,
          tone === "accent" && styles.infoChipTextAccent,
          tone === "success" && styles.infoChipTextSuccess,
          tone === "dark" && styles.infoChipTextDark,
          tone === "warning" && styles.infoChipTextWarning
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled = false
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary" ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Feather name={icon} size={15} color={variant === "primary" ? colors.inkOnDark : colors.ink} />
      <Text style={[styles.actionButtonText, variant === "secondary" && styles.actionButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  header: {
    gap: 6
  },
  eyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  progressCard: {
    gap: 10,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  loadingTrack: {
    height: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  loadingBar: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.accent
  },
  progressTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  progressBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  compareGrid: {
    flexDirection: "row",
    gap: 12
  },
  previewCard: {
    flex: 1,
    gap: 8,
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  previewLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  previewFrame: {
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.panelMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewEmpty: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  metaPanel: {
    gap: 10,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  infoChipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  infoChipSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft
  },
  infoChipNeutral: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.line
  },
  infoChipDark: {
    backgroundColor: colors.panelDark,
    borderColor: colors.lineDark
  },
  infoChipWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningSoft
  },
  infoChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  infoChipTextAccent: {
    color: colors.accentStrong
  },
  infoChipTextSuccess: {
    color: colors.success
  },
  infoChipTextDark: {
    color: colors.inkOnDark
  },
  infoChipTextWarning: {
    color: colors.warning
  },
  summaryBody: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  actionButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.lineStrong
  },
  actionButtonText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  actionButtonTextSecondary: {
    color: colors.ink
  },
  fitPanel: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  panelTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  panelSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  metricCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: 12,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  metricLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  metricValue: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6
  },
  fitBody: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  issueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  issueChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  issueText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  recommendationsPanel: {
    gap: 12
  },
  errorShell: {
    gap: 14,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  errorEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  errorTitle: {
    color: colors.inkOnDark,
    fontSize: 24,
    fontWeight: "800"
  },
  errorBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  message: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "700"
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
