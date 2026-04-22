import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  const [data, setData] = useState<TryOnRequest | null>(null);
  const [loading, setLoading] = useState(Boolean(requestId));
  const [error, setError] = useState<string | null>(null);

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
    load();

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
    if ((data.statusMessage ?? "").toLowerCase().includes("mock")) {
      derivedIssues.push("This run may still reflect mock provider behavior rather than a production rendering pipeline.");
    }

    return derivedIssues.length > 0
      ? derivedIssues
      : ["No blocking issues surfaced. This preview is strong enough to move into recommendation and shop comparison."];
  }, [data]);

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
        subtitle="Review the generated look, fit confidence, open issues, next alternatives, and retail follow-through before you buy."
      >
        <View style={styles.row}>
          <Pill label={data.status} tone={data.status === "COMPLETED" ? "success" : data.status === "FAILED" ? "warning" : "accent"} />
          <Pill label={data.provider} tone="neutral" />
          <Pill label={`${Math.round(confidence * 100)}% confidence`} tone={confidenceTone(confidence)} />
        </View>
        <View style={styles.previewPanel}>
          <View style={styles.previewOrbOne} />
          <View style={styles.previewOrbTwo} />
          <Text style={styles.previewLabel}>Look preview</Text>
          <Text style={styles.previewText}>
            {data.result?.summary ?? data.statusMessage ?? "The try-on request is still moving through the processing pipeline."}
          </Text>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Fit Review" title="Fit and confidence">
        <View style={styles.metricRow}>
          <MetricTile label="Confidence" value={`${Math.round(confidence * 100)}%`} caption="Provider-reported confidence" />
          <MetricTile label="Status" value={data.status} caption={data.statusMessage ?? "Latest queue state"} />
        </View>
        <InfoRow label="Product" value={data.variant?.product?.name ?? "Current try-on target"} />
        <InfoRow label="Variant" value={data.variant?.sizeLabel ?? "Auto-selected variant"} />
        <InfoRow label="Source image" value={data.sourceUpload?.key ?? "Uploaded asset"} />
      </SectionCard>

      <SectionCard eyebrow="Issues" title="What to watch">
        {issues.map((issue) => (
          <View key={issue} style={styles.issueRow}>
            <Feather name="alert-circle" size={18} color="#8a4f12" />
            <Text style={styles.issueText}>{issue}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Alternatives" title="What to do next">
        <PrimaryButton onPress={() => router.push("/recommendations")}>See alternatives</PrimaryButton>
        <PrimaryButton onPress={() => router.push("/tryon-upload")} variant="secondary">
          Upload another photo
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Buy Options" title="Move into offers">
        <Text style={styles.buyText}>
          This result is connected to the same product and recommendation graph, so the next safe step is comparing shops rather than guessing where to buy.
        </Text>
        <PrimaryButton onPress={() => router.push("/shops")}>Compare buy options</PrimaryButton>
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
  previewPanel: {
    minHeight: 200,
    borderRadius: 24,
    backgroundColor: "#ede2d1",
    borderWidth: 1,
    borderColor: "#dfcfb6",
    padding: 18,
    justifyContent: "flex-end",
    overflow: "hidden",
    gap: 8
  },
  previewOrbOne: {
    position: "absolute",
    top: -20,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "#cfb698"
  },
  previewOrbTwo: {
    position: "absolute",
    bottom: -30,
    left: -24,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: "#c8d3d0"
  },
  previewLabel: {
    color: "#6f5e49",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  previewText: {
    color: "#172033",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  issueText: {
    flex: 1,
    color: "#5d687d",
    fontSize: 14,
    lineHeight: 21
  },
  buyText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  }
});
