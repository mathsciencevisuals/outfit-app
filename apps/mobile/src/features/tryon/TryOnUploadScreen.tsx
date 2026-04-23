import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

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
import { colors, fonts, radius } from "../../theme/design";
import type { FitIssue } from "../../types/api";

const fitStyles = ["balanced", "relaxed", "tailored"];
const vibes = [
  { id: "cyberpunk-city", title: "Cyberpunk City", subtitle: "Neon edge and sharper contrast." },
  { id: "cozy-coffee-shop", title: "Cozy Coffee Shop", subtitle: "Soft tones and warmer styling." },
  { id: "y2k-studio", title: "Y2K Studio", subtitle: "Studio flash and bolder silhouette." }
] as const;

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
  const [vibe, setVibe] = useState<(typeof vibes)[number]["id"]>(vibes[0].id);
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

  const pickImage = async (kind: "self" | "garment", source: "camera" | "library") => {
    setSubmitError(null);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSubmitError(source === "camera" ? "Camera permission is required for capture." : "Photo library permission is required for upload.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8
          })
        : await ImagePicker.launchImageLibraryAsync({
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
      const comparisonLabel = `${firstProduct?.name ?? "Look"} / ${selectedVariant.sizeLabel ?? "size"} / ${vibe}`;
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
              comparisonLabel
            }
          )
        : profile?.avatarUploadId
          ? await mobileApi.createTryOn(userId, selectedVariant.id, {
              uploadId: profile.avatarUploadId,
              fitStyle,
              comparisonLabel
            })
          : null;

      if (!created) {
        throw new Error("Select a self image or use your uploaded profile image first.");
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
        <LoadingState title="Try-On" subtitle="Preparing upload, garment, and product context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Try-On" message="The upload flow could not load its product context." actionLabel="Go to feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (!selectedVariant?.id) {
    return (
      <Screen>
        <EmptyState title="No try-on item available" message="The catalog currently has no variant ready for the try-on flow." actionLabel="View recommendations" onAction={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Try-On"
        title="Create a new try-on from camera or upload"
        subtitle="This entry flow keeps capture, upload, profile reuse, fit guidance, and vibe selection in one hierarchy."
      >
        <View style={styles.badgeRow}>
          <Pill label={firstProduct?.name ?? "Selected item"} tone="accent" />
          <Pill label={activeSelfUri ? "Self image ready" : "Self image needed"} tone={activeSelfUri ? "success" : "warning"} />
          <Pill label={selectedGarment ? "Garment override attached" : "Using catalog garment"} tone="neutral" />
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.cameraBox}>
            <View style={styles.cameraFrame} />
            <Text style={styles.cameraText}>Live camera preview</Text>
          </View>
          <View style={styles.previewCard}>
            {activeSelfUri ? <Image source={{ uri: activeSelfUri }} style={styles.previewImage} /> : null}
            <Text style={styles.previewTitle}>Self picture</Text>
            <Text style={styles.previewText}>
              {selectedImage?.fileName ??
                (profile?.avatarUrl ? "Using your uploaded profile image until you replace it." : "Choose a clear front-facing source image.")}
            </Text>
            <View style={styles.actionRow}>
              <PrimaryButton onPress={() => pickImage("self", "camera")} variant="secondary" size="sm">
                Camera
              </PrimaryButton>
              <PrimaryButton onPress={() => pickImage("self", "library")} variant="secondary" size="sm">
                Upload
              </PrimaryButton>
            </View>
            {profile?.avatarUrl && !selectedImage ? (
              <PrimaryButton onPress={() => setSelectedImage(null)} variant="ghost" size="sm">
                Use profile photo
              </PrimaryButton>
            ) : null}
          </View>

          <View style={styles.previewCard}>
            {selectedGarment?.uri || selectedVariant.imageUrl || firstProduct?.imageUrl ? (
              <Image source={{ uri: selectedGarment?.uri ?? selectedVariant.imageUrl ?? firstProduct?.imageUrl ?? "" }} style={styles.previewImage} />
            ) : null}
            <Text style={styles.previewTitle}>Garment / product</Text>
            <Text style={styles.previewText}>
              {selectedGarment?.fileName ?? "Optional garment upload can override the catalog image for custom try-on tests."}
            </Text>
            <View style={styles.actionRow}>
              <PrimaryButton onPress={() => pickImage("garment", "camera")} variant="secondary" size="sm">
                Camera
              </PrimaryButton>
              <PrimaryButton onPress={() => pickImage("garment", "library")} variant="secondary" size="sm">
                Upload
              </PrimaryButton>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Size variation</Text>
        <SegmentedControl options={sizeOptions.length > 0 ? sizeOptions : ["Default"]} selected={selectedVariant.sizeLabel ?? sizeOptions[0]} onSelect={(value) => setSelectedVariantIndex(Math.max(0, sizeOptions.indexOf(value)))} />
        <Text style={styles.label}>Fit style</Text>
        <SegmentedControl options={fitStyles} selected={fitStyle} onSelect={setFitStyle} />
        <Text style={styles.label}>Vibe</Text>
        <View style={styles.vibeList}>
          {vibes.map((entry) => {
            const active = entry.id === vibe;
            return (
              <Pressable key={entry.id} onPress={() => setVibe(entry.id)} style={({ pressed }) => [styles.vibeCard, active && styles.vibeCardActive, pressed && styles.pressed]}>
                <Text style={[styles.vibeTitle, active && styles.vibeTitleActive]}>{entry.title}</Text>
                <Text style={[styles.vibeSubtitle, active && styles.vibeSubtitleActive]}>{entry.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

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
                <Pill label={`${Math.round(fitPreview.confidenceScore * 100)}% confidence`} tone={confidenceTone(fitPreview.confidenceScore)} />
              </View>
            </View>

            <View style={styles.metricRow}>
              <MetricTile label="Selected size" value={selectedVariant.sizeLabel ?? "--"} caption="Current variant choice" />
              <MetricTile label="Fit score" value={`${Math.round(fitPreview.fitScore)}`} caption="Relative suitability" />
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
          </>
        ) : null}
      </SectionCard>

      {submitError ? (
        <SectionCard eyebrow="Needs Attention" title="Try-on request could not start" subtitle={submitError}>
          <PrimaryButton onPress={() => setSubmitError(null)} variant="secondary" fullWidth={false}>
            Dismiss
          </PrimaryButton>
        </SectionCard>
      ) : null}

      <PrimaryButton onPress={submit} disabled={submitting}>
        {submitting ? "Creating try-on..." : "Generate try-on"}
      </PrimaryButton>
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
  cameraBox: {
    minHeight: 240,
    borderRadius: 24,
    backgroundColor: "#101322",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  cameraFrame: {
    width: 170,
    height: 200,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.6)"
  },
  cameraText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12
  },
  previewCard: {
    borderRadius: radius.lg,
    backgroundColor: "#fcf8f2",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: colors.pageStrong
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fonts.display
  },
  previewText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  actionRow: {
    flexDirection: "row",
    gap: 8
  },
  label: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  vibeList: {
    gap: 10
  },
  vibeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fcf8f2",
    padding: 14,
    gap: 4
  },
  vibeCardActive: {
    backgroundColor: "#e4edf2",
    borderColor: "#bfcfda"
  },
  vibeTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  },
  vibeTitleActive: {
    color: colors.accent
  },
  vibeSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  vibeSubtitleActive: {
    color: colors.accent
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
  issueWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  pressed: {
    opacity: 0.92
  }
});
