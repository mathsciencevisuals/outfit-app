import { Feather } from "@expo/vector-icons";
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
import { colors, radius } from "../../theme/design";
import type { FitIssue } from "../../types/api";

const fitStyles = ["balanced", "relaxed", "tailored"];
const vibes = [
  { id: "midnight-glam", title: "Midnight Glam", subtitle: "Glossy contrast and stronger shine." },
  { id: "soft-campus", title: "Soft Campus", subtitle: "Lighter polish with relaxed styling." },
  { id: "editorial-street", title: "Editorial Street", subtitle: "Sharper framing and moodier energy." }
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
  const activeGarmentUri = selectedGarment?.uri ?? selectedVariant?.imageUrl ?? firstProduct?.imageUrl ?? null;

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
      return;
    }

    setSelectedGarment(result.assets[0] ?? null);
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
              garmentUploadId: undefined,
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
      setSubmitError(nextError instanceof Error ? nextError.message : "Failed to start try-on");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen tone="dark">
        <LoadingState title="Try-On" subtitle="Preparing upload, garment, and product context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark">
        <ErrorState title="Try-On" message="The upload flow could not load its product context." actionLabel="Go to feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (!selectedVariant?.id) {
    return (
      <Screen tone="dark">
        <EmptyState title="No try-on item available" message="The catalog currently has no variant ready for the try-on flow." actionLabel="View recommendations" onAction={() => router.push("/recommendations")} />
      </Screen>
    );
  }

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="Try-On"
        title="Upload, frame, and generate"
        subtitle="The entry flow now behaves like a camera stage: clear self-image status, garment override, vibe selection, and a strong generation CTA."
      >
        <View style={styles.statusRow}>
          <Pill label={activeSelfUri ? "Self image ready" : "Self image needed"} tone={activeSelfUri ? "success" : "warning"} />
          <Pill label={selectedGarment ? "Custom garment" : "Catalog garment"} tone="info" />
          <Pill label={vibes.find((entry) => entry.id === vibe)?.title ?? "Vibe"} tone="accent" />
        </View>

        <View style={styles.stage}>
          <View style={styles.stagePanel}>
            <Text style={styles.stageLabel}>Self capture</Text>
            <View style={styles.frame}>
              {activeSelfUri ? <Image source={{ uri: activeSelfUri }} style={styles.frameImage} /> : <Feather name="user" size={28} color={colors.inkOnDarkSoft} />}
              <View style={styles.frameCorners} />
            </View>
            <Text style={styles.stageText}>
              {selectedImage?.fileName ??
                (profile?.avatarUrl ? "Using your uploaded profile image until you replace it." : "Choose a clear front-facing image to avoid a weak try-on render.")}
            </Text>
            <View style={styles.actionRow}>
              <PrimaryButton onPress={() => pickImage("self", "camera")} variant="secondary" size="sm">
                Camera
              </PrimaryButton>
              <PrimaryButton onPress={() => pickImage("self", "library")} variant="secondary" size="sm">
                Upload
              </PrimaryButton>
            </View>
          </View>

          <View style={styles.stagePanel}>
            <Text style={styles.stageLabel}>Garment source</Text>
            <View style={styles.frame}>
              {activeGarmentUri ? <Image source={{ uri: activeGarmentUri }} style={styles.frameImage} /> : <Feather name="shopping-bag" size={28} color={colors.inkOnDarkSoft} />}
              <View style={styles.frameCorners} />
            </View>
            <Text style={styles.stageText}>
              {selectedGarment?.fileName ?? "Use the catalog garment or override it with a custom piece for a different visual test."}
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

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.ctaStrip}>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>Ready to generate</Text>
            <Text style={styles.ctaText}>Uploads are persisted first, then the request is created and polled from the result screen.</Text>
          </View>
          <PrimaryButton onPress={submit} disabled={submitting || !activeSelfUri}>
            {submitting ? "Generating..." : "Generate try-on"}
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Fit Intelligence"
        title="Recommended size before you render"
        subtitle="Keep the fit layer up front so users know whether the current selection is worth rendering."
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

            {fitPreview.issues?.length ? (
              <View style={styles.issueRow}>
                {fitPreview.issues.slice(0, 3).map((issue) => (
                  <Pill key={issue.code} label={issue.message} tone={issueTone(issue)} />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState title="Fit preview missing" message="Fit guidance could not be derived for this product variant." />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  stage: {
    gap: 12
  },
  stagePanel: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 12
  },
  stageLabel: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  frame: {
    height: 220,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center"
  },
  frameImage: {
    width: "100%",
    height: "100%"
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  stageText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  label: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800"
  },
  vibeList: {
    gap: 10
  },
  vibeCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 4
  },
  vibeCardActive: {
    backgroundColor: "rgba(99,91,255,0.22)",
    borderColor: "rgba(139,131,255,0.38)"
  },
  vibeTitle: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "800"
  },
  vibeTitleActive: {
    color: colors.inkOnDark
  },
  vibeSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  vibeSubtitleActive: {
    color: colors.inkOnDark
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  errorText: {
    color: "#ffb4bf",
    fontSize: 12,
    lineHeight: 18
  },
  ctaStrip: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 12
  },
  ctaCopy: {
    gap: 4
  },
  ctaTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "800"
  },
  ctaText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
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
  issueRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  pressed: {
    opacity: 0.92
  }
});
