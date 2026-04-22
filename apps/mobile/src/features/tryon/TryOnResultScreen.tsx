import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { TryOnRequest } from "../../types/api";

function confidenceTone(confidence?: number) {
  if (!confidence) {
    return "warning" as const;
  }
  if (confidence >= 0.85) {
    return "success" as const;
  }
  if (confidence >= 0.7) {
    return "accent" as const;
  }
  return "warning" as const;
}

export function TryOnResultScreen() {
  const router = useRouter();
  const requestId = useAppStore((state) => state.lastTryOnRequestId);
  const userId = useAppStore((state) => state.userId);
  const [data, setData] = useState<TryOnRequest | null>(null);
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

  const confidence = data?.result?.confidence ?? 0;
  const issues = useMemo(() => {
    if (!data) {
      return [];
    }
    if (data.status === "FAILED") {
      return ["Generation did not finish cleanly, so this preview should not be used for buy decisions yet."];
    }
    if (data.status === "QUEUED" || data.status === "PROCESSING") {
      return ["The request is still in progress, so fit interpretation is provisional until completion."];
    }

    const derivedIssues: string[] = [];
    if (confidence < 0.8) {
      derivedIssues.push("Confidence is moderate, so fabric drape and silhouette may need a second pass.");
    }
    if (!data.result?.overlayImageUrl) {
      derivedIssues.push("No overlay asset was returned, so garment placement feedback is limited.");
    }

    return derivedIssues.length > 0
      ? derivedIssues
      : ["No blocking issues surfaced. This preview is strong enough to move into recommendation and shop comparison."];
  }, [confidence, data]);

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
        eyebrow="Try-On Review"
        title={data.variant?.product?.name ?? "Latest try-on preview"}
        subtitle="Review the generated look, fit confidence, open issues, comparisons, and save/share actions before you buy."
      >
        <View style={styles.row}>
          <Pill label={data.status} tone={data.status === "COMPLETED" ? "success" : data.status === "FAILED" ? "warning" : "accent"} />
          <Pill label={data.fitStyle ?? "balanced"} tone="neutral" />
          <Pill label={`${Math.round(confidence * 100)}% confidence`} tone={confidenceTone(confidence)} />
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

      <SectionCard eyebrow="Fit Review" title="Fit and variation details">
        <View style={styles.metricRow}>
          <MetricTile label="Confidence" value={`${Math.round(confidence * 100)}%`} caption="Provider-reported confidence" />
          <MetricTile label="Status" value={data.status} caption={data.statusMessage ?? "Latest queue state"} />
        </View>
        <InfoRow label="Product" value={data.variant?.product?.name ?? "Current try-on target"} />
        <InfoRow label="Selected size" value={String(data.result?.metadata?.selectedSize ?? data.variant?.sizeLabel ?? "Auto")} />
        <InfoRow label="Selected color" value={String(data.result?.metadata?.selectedColor ?? data.variant?.color ?? "Catalog")} />
        <InfoRow label="Fit style" value={String(data.result?.metadata?.fitStyle ?? data.fitStyle ?? "balanced")} />
      </SectionCard>

      <SectionCard eyebrow="Issues" title="What to watch">
        {issues.map((issue) => (
          <View key={issue} style={styles.issueRow}>
            <Text style={styles.issueText}>{issue}</Text>
          </View>
        ))}
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
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  issueRow: {
    borderRadius: 18,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 12
  },
  issueText: {
    color: "#5d687d",
    fontSize: 14,
    lineHeight: 21
  },
  message: {
    color: "#5f697d",
    fontSize: 14
  }
});
