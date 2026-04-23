import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { FitIssue } from "../../types/api";

const fitStyles = ["balanced", "relaxed", "tailored"];

function confidenceTone(confidence?: number) {
  if (!confidence) {
    return "warning" as const;
  }
  if (confidence >= 0.82) {
    return "success" as const;
  }
  if (confidence >= 0.65) {
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

export function TryOnUploadScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);
  const setLastTryOnRequestId = useAppStore((state) => state.setLastTryOnRequestId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [fitStyle, setFitStyle] = useState("balanced");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstProduct = data?.[0];
  const variants = firstProduct?.variants ?? [];
  const selectedVariant = variants[selectedVariantIndex] ?? variants[0];
  const sizeOptions = variants.map((variant) => variant.sizeLabel ?? "One");
  const activeSelfUri = selectedImage?.uri ?? profile?.avatarUrl ?? null;

  const colorOptions = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[],
    [variants]
  );

  const {
    data: fitPreview,
    loading: fitLoading
  } = useAsyncResource(async () => {
    if (!firstProduct?.id || !selectedVariant?.id) {
      return null;
    }

    return mobileApi.productFitPreview(firstProduct.id, {
      variantId: selectedVariant.id,
      chosenSizeLabel: selectedVariant.sizeLabel,
      fitPreference: profile?.fitPreference ?? "regular"
    });
  }, [firstProduct?.id, profile?.fitPreference, selectedVariant?.id, selectedVariant?.sizeLabel]);

  const pickImage = async (kind: "self" | "garment") => {
    setSubmitError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled) {
      return;
    }

    if (kind === "self") {
      setSelectedImage(result.assets[0] ?? null);
    } else {
      setSelectedGarment(result.assets[0] ?? null);
    }
  };

  const submit = async () => {
    if (!selectedVariant?.id || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = selectedImage
        ? await mobileApi.createTryOnFromAssets(
            userId,
            selectedVariant.id,
            {
              uri: selectedImage.uri,
              fileName: selectedImage.fileName,
              mimeType: selectedImage.mimeType
            },
            {
              garmentAsset: selectedGarment
                ? {
                    uri: selectedGarment.uri,
                    fileName: selectedGarment.fileName,
                    mimeType: selectedGarment.mimeType
                  }
                : null,
              fitStyle,
              comparisonLabel: `${firstProduct?.name ?? "Look"} / ${selectedVariant.sizeLabel ?? "size"}`
            }
          )
        : profile?.avatarUploadId
          ? await mobileApi.createTryOn(userId, selectedVariant.id, {
              uploadId: profile.avatarUploadId,
              fitStyle,
              comparisonLabel: `${firstProduct?.name ?? "Look"} / ${selectedVariant.sizeLabel ?? "size"}`
            })
          : null;

      if (!created) {
        throw new Error("Select a self image or upload one from your profile first");
      }

      setLastTryOnRequestId(created.id);
      router.push("/tryon-result");
    } catch (nextError: unknown) {
      setSubmitError(nextError instanceof Error ? nextError.message : "Failed to upload image");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Try-on upload" subtitle="Preparing upload, garment, and product context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="Try-on upload"
          message="The upload flow could not load its product context."
          actionLabel="Go to discover"
          onRetry={() => router.push("/discover")}
        />
      </Screen>
    );
  }

  if (!selectedVariant?.id) {
    return (
      <Screen>
        <EmptyState
          title="No try-on item available"
          message="The catalog currently has no variant ready for the try-on flow."
          actionLabel="View recommendations"
          onAction={() => router.push("/recommendations")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Try-On"
        title="Upload your self picture and garment reference"
        subtitle="Use your saved profile image or upload a new one, then generate a visual try-on backed by fit guidance."
      >
        <View style={styles.badgeRow}>
          <Pill label={firstProduct?.name ?? "Selected item"} tone="accent" />
          <Pill label={activeSelfUri ? "Self image ready" : "Self image needed"} tone={activeSelfUri ? "success" : "warning"} />
          <Pill label={selectedGarment ? "Garment override attached" : "Using catalog garment"} tone="neutral" />
        </View>
        <View style={styles.previewGrid}>
          <View style={styles.previewCard}>
            {activeSelfUri ? <Image source={{ uri: activeSelfUri }} style={styles.previewImage} /> : null}
            <Text style={styles.previewTitle}>Self picture</Text>
            <Text style={styles.previewText}>
              {selectedImage?.fileName ??
                (profile?.avatarUrl
                  ? "Using your uploaded profile image until you replace it."
                  : "Choose a clear front-facing source image.")}
            </Text>
            <PrimaryButton onPress={() => pickImage("self")} variant="secondary" size="sm">
              {profile?.avatarUrl && !selectedImage ? "Replace self image" : "Select self image"}
            </PrimaryButton>
          </View>

          <View style={styles.previewCard}>
            {selectedGarment?.uri || selectedVariant.imageUrl || firstProduct?.imageUrl ? (
              <Image
                source={{ uri: selectedGarment?.uri ?? selectedVariant.imageUrl ?? firstProduct?.imageUrl ?? "" }}
                style={styles.previewImage}
              />
            ) : null}
            <Text style={styles.previewTitle}>Garment / product</Text>
            <Text style={styles.previewText}>
              {selectedGarment?.fileName ?? "Optional garment upload can override the catalog image for custom try-on tests."}
            </Text>
            <PrimaryButton onPress={() => pickImage("garment")} variant="secondary" size="sm">
              Upload garment
            </PrimaryButton>
          </View>
        </View>

        <Text style={styles.label}>Size variation</Text>
        <SegmentedControl
          options={sizeOptions.length > 0 ? sizeOptions : ["Default"]}
          selected={selectedVariant.sizeLabel ?? sizeOptions[0]}
          onSelect={(value) => setSelectedVariantIndex(Math.max(0, sizeOptions.indexOf(value)))}
        />
        <Text style={styles.label}>Fit style</Text>
        <SegmentedControl options={fitStyles} selected={fitStyle} onSelect={setFitStyle} />

        <View style={styles.colorRow}>
          {colorOptions.map((color) => (
            <Pill key={color} label={color} tone={color === selectedVariant.color ? "success" : "neutral"} />
          ))}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Fit Intelligence"
        title="Recommended size before you render"
        subtitle="This layer uses your measurement profile and the product size chart, so it can guide the decision before the visual try-on finishes."
      >
        {fitLoading ? (
          <LoadingState title="Fit guidance" subtitle="Scoring size options for the selected garment." />
        ) : fitPreview ? (
          <>
            <View style={styles.fitHero}>
              <View style={styles.fitHeroCopy}>
                <Text style={styles.fitHeroEyebrow}>Best current size</Text>
                <Text style={styles.fitHeroSize}>{fitPreview.recommendedSize ?? "n/a"}</Text>
                <Text style={styles.fitHeroText}>{fitPreview.explanation}</Text>
              </View>
              <View style={styles.fitHeroBadges}>
                <Pill label={`${fitPreview.fitLabel} fit`} tone={fitTone(fitPreview.fitLabel)} />
                <Pill
                  label={`${Math.round(fitPreview.confidenceScore * 100)}% confidence`}
                  tone={confidenceTone(fitPreview.confidenceScore)}
                />
              </View>
            </View>

            <View style={styles.metricRow}>
              <MetricTile
                label="Selected size"
                value={selectedVariant.sizeLabel ?? "--"}
                caption="Current variant choice"
              />
              <MetricTile
                label="Fit score"
                value={`${Math.round(fitPreview.fitScore)}`}
                caption="Relative suitability"
              />
            </View>

            {fitPreview.recommendedSize && fitPreview.recommendedSize !== selectedVariant.sizeLabel ? (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>Size adjustment suggested</Text>
                <Text style={styles.warningText}>
                  You selected {selectedVariant.sizeLabel}, but the current fit read prefers {fitPreview.recommendedSize}.
                </Text>
              </View>
            ) : null}

            <View style={styles.issueWrap}>
              {fitPreview.issues.length > 0 ? (
                fitPreview.issues.map((issue) => (
                  <Pill key={issue.code} label={issue.code.replace(/-/g, " ")} tone={issueTone(issue)} />
                ))
              ) : (
                <Pill label="No major issue flags" tone="success" />
              )}
            </View>

            {fitPreview.alternatives.length > 0 ? (
              <View style={styles.altList}>
                {fitPreview.alternatives.map((alternative) => (
                  <View key={alternative.sizeLabel} style={styles.altCard}>
                    <View style={styles.altHeader}>
                      <Text style={styles.altSize}>{alternative.sizeLabel}</Text>
                      <Pill label={`${Math.round(alternative.fitScore)}`} tone="info" />
                    </View>
                    <Text style={styles.previewText}>{alternative.reason}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.previewText}>
            Fit guidance will appear once the product and your measurements have enough structured data.
          </Text>
        )}
      </SectionCard>

      <SectionCard eyebrow="Product Scan" title="Generate try-on">
        <Text style={styles.previewText}>
          The visual render will use the selected variant and your saved fit profile, with fit guidance shown again on the result screen.
        </Text>
        <PrimaryButton variant="ghost" disabled size="sm">
          Scan product coming soon
        </PrimaryButton>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <PrimaryButton onPress={submit} disabled={!activeSelfUri || submitting}>
          {submitting ? "Uploading and queueing..." : "Generate try-on"}
        </PrimaryButton>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  previewGrid: {
    gap: 12
  },
  previewCard: {
    borderRadius: 22,
    backgroundColor: "#f6efe5",
    borderWidth: 1,
    borderColor: "#e6d7c0",
    padding: 16,
    gap: 8
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#eadcc7"
  },
  previewTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "700"
  },
  previewText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  },
  warningText: {
    color: "#8a4f12",
    fontSize: 14,
    lineHeight: 20
  },
  label: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700"
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
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
  issueWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
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
  error: {
    color: "#a0392b",
    fontSize: 14,
    lineHeight: 20
  }
});
