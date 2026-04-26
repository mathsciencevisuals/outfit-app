import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { demoData } from "../../demo/demo-data";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { FitResult, Recommendation, TryOnRequest } from "../../types/api";

function metricValue(value: number) {
  return `${Math.round(value)}%`;
}

export function TryOnResultScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const requestId = useAppStore((state) => state.lastTryOnRequestId);

  const [request, setRequest] = useState<TryOnRequest | null>(null);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!requestId) {
        setRequest(demoData.tryOnRequest);
        setFitResult(demoData.fitResult);
        setRecommendations(demoData.recommendations.slice(0, 3));
        return;
      }

      const nextRequest = await mobileApi.tryOnResult(requestId);
      const productId = nextRequest.variant?.product?.id ?? demoData.products[0].id;
      const [nextFit, nextRecommendations] = await Promise.all([
        mobileApi.productFitPreview(productId, {
          variantId: nextRequest.variant?.id,
          chosenSizeLabel: nextRequest.variant?.sizeLabel
        }),
        mobileApi.recommendations(userId, { productId })
      ]);

      if (!mounted) {
        return;
      }

      setRequest(nextRequest);
      setFitResult(nextFit);
      setRecommendations(nextRecommendations.length > 0 ? nextRecommendations.slice(0, 3) : demoData.recommendations.slice(0, 3));
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [requestId, userId]);

  const activeRequest = request ?? demoData.tryOnRequest;
  const product = activeRequest.variant?.product ?? demoData.products[0];
  const variant = activeRequest.variant ?? product.variants?.[1] ?? product.variants?.[0];
  const resultImage = activeRequest.result?.outputImageUrl ?? demoData.tryOnRequest.result?.outputImageUrl;
  const fitQuality = (fitResult?.fitScore ?? 91);
  const styleMatch = Math.min(98, Math.max(82, Math.round((recommendations[0]?.score ?? 88))));
  const colorMatch = fitResult?.confidenceScore ? Math.round(fitResult.confidenceScore * 100) + 4 : 96;

  const saveToWardrobe = async () => {
    const saved = await mobileApi.saveLook(userId, {
      name: `${product.name} saved look`,
      note: activeRequest.result?.summary ?? "Saved from try-on result.",
      productIds: [product.id],
      isWishlist: false
    });
    setMessage(`Saved ${saved.name}`);
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.imageCard}>
          <SmartImage uri={resultImage} label={product.name} containerStyle={styles.resultImageWrap} style={styles.resultImage} fallbackTone="accent" />
          <View style={styles.matchBadge}>
            <Text style={styles.matchValue}>{metricValue(fitQuality)}</Text>
            <Text style={styles.matchLabel}>Match</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.subtitle}>
            {product.brand?.name ?? "FitMe"} · Rs. {Math.round(variant?.price ?? 0)} · Size {fitResult?.recommendedSize ?? variant?.sizeLabel ?? "M"}
          </Text>

          <MetricRow label="Fit Quality" value={fitQuality} />
          <MetricRow label="Style Match" value={styleMatch} />
          <MetricRow label="Color Match" value={colorMatch} />

          <Text style={styles.summary}>
            {activeRequest.result?.summary ?? fitResult?.explanation ?? "Generated try-on result is ready with fit and style guidance."}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton onPress={() => router.push("/recommendations")} variant="secondary">
            See Similar
          </PrimaryButton>
          <PrimaryButton onPress={() => Linking.openURL(activeRequest.variant?.product?.offerSummary?.bestOffer?.externalUrl ?? demoData.shops[0].url ?? "https://example.com")}>
            Buy Now
          </PrimaryButton>
        </View>
        <PrimaryButton onPress={() => void saveToWardrobe()} variant="ghost">
          Save to Wardrobe
        </PrimaryButton>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.similarCard}>
          <Text style={styles.similarTitle}>Next up</Text>
          {recommendations.slice(0, 2).map((entry) => (
            <Pressable key={entry.productId} onPress={() => router.push("/recommendations")} style={({ pressed }) => [styles.similarRow, pressed && styles.pressed]}>
              <SmartImage
                uri={entry.product?.imageUrl}
                label={entry.product?.name ?? "Recommended"}
                containerStyle={styles.similarThumbWrap}
                style={styles.similarThumb}
              />
              <View style={styles.similarCopy}>
                <Text style={styles.similarName}>{entry.product?.name ?? "Recommended piece"}</Text>
                <Text style={styles.similarMeta}>
                  {entry.product?.brand?.name ?? "FitMe"} · Rs. {Math.round(entry.product?.variants?.[1]?.price ?? entry.product?.variants?.[0]?.price ?? 0)}
                </Text>
              </View>
              <Text style={styles.similarScore}>{metricValue(entry.score)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueWrap}>
        <View style={styles.metricTrack}>
          <View style={[styles.metricFill, { width: `${Math.max(8, Math.min(100, value))}%` }]} />
        </View>
        <Text style={styles.metricText}>{metricValue(value)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  imageCard: {
    position: "relative",
    padding: 10,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  resultImageWrap: {
    aspectRatio: 0.77
  },
  resultImage: {
    width: "100%",
    height: "100%"
  },
  matchBadge: {
    position: "absolute",
    top: 22,
    right: 22,
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,11,19,0.82)",
    borderWidth: 3,
    borderColor: colors.accent
  },
  matchValue: {
    color: colors.inkOnDark,
    fontSize: 20,
    fontWeight: "800"
  },
  matchLabel: {
    color: colors.inkOnDarkSoft,
    fontSize: 11
  },
  infoCard: {
    gap: 10,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  metricLabel: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  metricValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end"
  },
  metricTrack: {
    width: 110,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  metricFill: {
    height: "100%",
    backgroundColor: colors.accent
  },
  metricText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "700"
  },
  summary: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  message: {
    color: colors.inkOnDark,
    fontSize: 14
  },
  similarCard: {
    gap: 12,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  similarTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  similarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  similarThumbWrap: {
    width: 64,
    height: 82
  },
  similarThumb: {
    width: "100%",
    height: "100%"
  },
  similarCopy: {
    flex: 1,
    gap: 4
  },
  similarName: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "700"
  },
  similarMeta: {
    color: colors.inkOnDarkSoft,
    fontSize: 12
  },
  similarScore: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.92
  }
});
