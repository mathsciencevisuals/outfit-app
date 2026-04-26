import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { FitIssue } from "../../types/api";
import { Screen } from "../../components/Screen";
import { demoData } from "../../demo/demo-data";
import { demoModeEnabled } from "../../utils/env";

const fitStyles = [
  { id: "balanced", title: "Balanced" },
  { id: "relaxed", title: "Relaxed" },
  { id: "tailored", title: "Tailored" }
] as const;

const vibes = [
  { id: "cyberpunk-city", title: "Cyberpunk City", subtitle: "Sharper glow, moodier contrast." },
  { id: "cozy-coffee-shop", title: "Cozy Coffee Shop", subtitle: "Softer indoor warmth and casual framing." },
  { id: "y2k-studio", title: "Y2K Studio", subtitle: "Brighter flash, playful styling, cleaner pop." }
] as const;

function confidenceTone(confidence?: number) {
  if (!confidence) {
    return colors.warning;
  }
  if (confidence >= 0.82) {
    return colors.success;
  }
  if (confidence >= 0.65) {
    return colors.info;
  }
  return colors.warning;
}

function issueTone(issue: FitIssue) {
  if (issue.severity === "high") {
    return colors.dangerSoft;
  }
  if (issue.severity === "medium") {
    return colors.warningSoft;
  }
  return colors.infoSoft;
}

function issueTextColor(issue: FitIssue) {
  if (issue.severity === "high") {
    return colors.danger;
  }
  if (issue.severity === "medium") {
    return colors.warning;
  }
  return colors.info;
}

function formatPrice(value?: number | null) {
  return value != null ? `Rs. ${Math.round(value)}` : "Price pending";
}

export function TryOnUploadScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);
  const setLastTryOnRequestId = useAppStore((state) => state.setLastTryOnRequestId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [useDemoSelf, setUseDemoSelf] = useState(false);
  const [useDemoGarment, setUseDemoGarment] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [fitStyle, setFitStyle] = useState<(typeof fitStyles)[number]["id"]>("balanced");
  const [vibe, setVibe] = useState<(typeof vibes)[number]["id"]>(vibes[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const featuredProduct = data?.[0] ?? demoData.products[0];
  const variants = featuredProduct?.variants ?? [];
  const selectedVariant = variants[selectedVariantIndex] ?? variants[0];
  const selectedVibe = vibes.find((entry) => entry.id === vibe) ?? vibes[0];

  const fallbackProductImage =
    selectedVariant?.imageUrl ?? featuredProduct?.imageUrl ?? demoData.tryOnRequest.garmentUpload?.publicUrl ?? null;
  const selfPreviewUri =
    selectedImage?.uri ??
    (useDemoSelf && demoModeEnabled ? demoData.tryOnRequest.sourceUpload?.publicUrl : null) ??
    profile?.avatarUrl ??
    null;
  const garmentPreviewUri =
    selectedGarment?.uri ??
    (useDemoGarment && demoModeEnabled ? demoData.tryOnRequest.garmentUpload?.publicUrl : null) ??
    fallbackProductImage;

  const variantOptions = variants.map((variant) => variant.sizeLabel ?? "One size");
  const colorOptions = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[],
    [variants]
  );

  const comparisonLabel = `${selectedVibe.title} / ${featuredProduct?.name ?? "Look"} / ${selectedVariant?.sizeLabel ?? "M"} / ${fitStyle}`;

  const {
    data: fitPreview,
    loading: fitLoading
  } = useAsyncResource(async () => {
    if (!featuredProduct?.id || !selectedVariant?.id) {
      return null;
    }

    return mobileApi.productFitPreview(featuredProduct.id, {
      variantId: selectedVariant.id,
      chosenSizeLabel: selectedVariant.sizeLabel,
      fitPreference: profile?.fitPreference ?? "regular"
    });
  }, [featuredProduct?.id, profile?.fitPreference, selectedVariant?.id, selectedVariant?.sizeLabel]);

  const canGenerate = Boolean(selectedVariant?.id) && Boolean(selectedImage || profile?.avatarUploadId || useDemoSelf);

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
      setUseDemoSelf(false);
      setSelectedImage(result.assets[0] ?? null);
      return;
    }

    setUseDemoGarment(false);
    setSelectedGarment(result.assets[0] ?? null);
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
                : useDemoGarment && demoModeEnabled
                  ? {
                      uri: demoData.tryOnRequest.garmentUpload?.publicUrl ?? fallbackProductImage ?? "",
                      fileName: "demo-garment.png",
                      mimeType: "image/png"
                    }
                  : null,
              fitStyle,
              comparisonLabel
            }
          )
        : useDemoSelf && demoModeEnabled
          ? await mobileApi.createTryOnFromAssets(
              userId,
              selectedVariant.id,
              {
                uri: demoData.tryOnRequest.sourceUpload?.publicUrl ?? "",
                fileName: "demo-self.png",
                mimeType: "image/png"
              },
              {
                garmentAsset: selectedGarment
                  ? {
                      uri: selectedGarment.uri,
                      fileName: selectedGarment.fileName,
                      mimeType: selectedGarment.mimeType
                    }
                  : useDemoGarment && demoModeEnabled
                    ? {
                        uri: demoData.tryOnRequest.garmentUpload?.publicUrl ?? fallbackProductImage ?? "",
                        fileName: "demo-garment.png",
                        mimeType: "image/png"
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
        throw new Error("Use an uploaded photo, your saved profile photo, or demo mode photo first.");
      }

      setLastTryOnRequestId(created.id);
      router.push("/tryon-result");
    } catch (nextError: unknown) {
      setSubmitError(nextError instanceof Error ? nextError.message : "Failed to start try-on.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <LoadingState title="Try-On" subtitle="Preparing camera, catalog, and fit preview context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <ErrorState
          title="Try-On"
          message="The try-on screen could not load product context."
          actionLabel="Feed"
          onRetry={() => router.push("/feed")}
        />
      </Screen>
    );
  }

  if (!selectedVariant?.id) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <EmptyState
          title="No try-on garment available"
          message="The catalog does not currently expose a garment variant for try-on."
          actionLabel="Shops"
          onAction={() => router.push("/retail")}
        />
      </Screen>
    );
  }

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Try-On</Text>
          <Text style={styles.title}>Capture your fit</Text>
          <Text style={styles.subtitle}>
            Use camera, upload, your saved profile image, or demo assets to stage a screenshot-ready try-on request.
          </Text>
        </View>

        <View style={styles.cameraPanel}>
          <View style={styles.cameraHeader}>
            <Text style={styles.sectionTitle}>Capture your fit</Text>
            <View style={styles.inlineChips}>
              <InfoChip label={selectedVibe.title} />
              <InfoChip label={fitStyle} tone="accent" />
            </View>
          </View>
          <View style={styles.cameraStage}>
            {selfPreviewUri ? <Image source={{ uri: selfPreviewUri }} style={styles.cameraImage} /> : null}
            <View style={styles.captureFrame} />
            {!selfPreviewUri ? (
              <View style={styles.cameraHint}>
                <Feather name="image" size={22} color={colors.inkOnDarkSoft} />
                <Text style={styles.cameraHintTitle}>No source photo selected</Text>
                <Text style={styles.cameraHintBody}>Start camera, upload a portrait, or use your saved profile photo.</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.buttonRow}>
            <ActionButton label="Start camera" icon="camera" onPress={() => void pickImage("self", "camera")} variant="secondary" />
            <ActionButton label="Capture" icon="aperture" onPress={() => void pickImage("self", "camera")} variant="secondary" />
            <ActionButton label="Upload photo" icon="upload" onPress={() => void pickImage("self", "library")} />
          </View>
          {demoModeEnabled ? (
            <View style={styles.buttonRow}>
              <ActionButton
                label={useDemoSelf ? "Demo photo selected" : "Use demo photo"}
                icon="star"
                onPress={() => {
                  setSelectedImage(null);
                  setUseDemoSelf(true);
                }}
                variant="secondary"
              />
              <ActionButton
                label={useDemoGarment ? "Demo garment selected" : "Use demo garment"}
                icon="shopping-bag"
                onPress={() => {
                  setSelectedGarment(null);
                  setUseDemoGarment(true);
                }}
                variant="secondary"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.previewGrid}>
          <PreviewCard
            title="Your photo preview"
            subtitle={
              selectedImage
                ? "Uploaded from camera or gallery"
                : useDemoSelf && demoModeEnabled
                  ? "Demo portrait for screenshots"
                  : profile?.avatarUrl
                    ? "Using saved profile photo"
                    : "No self image yet"
            }
            imageUri={selfPreviewUri}
            emptyLabel="Your photo"
          />
          <PreviewCard
            title="Garment image preview"
            subtitle={
              selectedGarment
                ? "Uploaded garment image"
                : useDemoGarment && demoModeEnabled
                  ? "Demo garment for screenshots"
                  : "Selected variant or product fallback"
            }
            imageUri={garmentPreviewUri}
            emptyLabel="Garment"
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Scene vibe</Text>
          <View style={styles.optionGrid}>
            {vibes.map((entry) => {
              const active = entry.id === vibe;
              return (
                <Pressable key={entry.id} onPress={() => setVibe(entry.id)} style={({ pressed }) => [styles.optionCard, active && styles.optionCardActive, pressed && styles.pressed]}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{entry.title}</Text>
                  <Text style={[styles.optionSubtitle, active && styles.optionSubtitleActive]}>{entry.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Fit style</Text>
          <View style={styles.segmentRow}>
            {fitStyles.map((entry) => {
              const active = entry.id === fitStyle;
              return (
                <Pressable key={entry.id} onPress={() => setFitStyle(entry.id)} style={({ pressed }) => [styles.segmentChip, active && styles.segmentChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{entry.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Size / variant picker</Text>
          <View style={styles.productCard}>
            {fallbackProductImage ? <Image source={{ uri: fallbackProductImage }} style={styles.productImage} /> : null}
            <View style={styles.productCopy}>
              <Text style={styles.productTitle}>{featuredProduct?.name ?? "Selected garment"}</Text>
              <Text style={styles.productBody}>
                {selectedVariant?.color ? `${selectedVariant.color} · ` : ""}
                {selectedVariant?.sizeLabel ?? "One size"} · {formatPrice(selectedVariant?.price ?? featuredProduct?.priceAnchor)}
              </Text>
              <View style={styles.inlineChips}>
                {colorOptions.slice(0, 3).map((color) => (
                  <InfoChip key={color} label={color} tone={color === selectedVariant?.color ? "accent" : "neutral"} />
                ))}
              </View>
            </View>
          </View>
          <View style={styles.segmentRow}>
            {variantOptions.map((label, index) => {
              const active = index === selectedVariantIndex;
              return (
                <Pressable key={`${label}-${index}`} onPress={() => setSelectedVariantIndex(index)} style={({ pressed }) => [styles.segmentChip, active && styles.segmentChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fitPanel}>
          <View style={styles.fitHeader}>
            <View>
              <Text style={styles.sectionTitle}>Fit preview</Text>
              <Text style={styles.fitSubtitle}>Confidence, recommended size, and issue flags before render.</Text>
            </View>
            {fitPreview ? (
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: confidenceTone(fitPreview.confidenceScore) }]}>
                  {Math.round(fitPreview.confidenceScore * 100)}%
                </Text>
              </View>
            ) : null}
          </View>
          {fitLoading ? (
            <LoadingState title="Fit preview" subtitle="Scoring the selected garment against your profile." />
          ) : fitPreview ? (
            <>
              <View style={styles.fitMetrics}>
                <MetricCard label="Recommended size" value={fitPreview.recommendedSize ?? "--"} />
                <MetricCard label="Fit label" value={fitPreview.fitLabel} />
                <MetricCard label="Fit score" value={`${fitPreview.fitScore}%`} />
              </View>
              <Text style={styles.fitExplanation}>{fitPreview.explanation}</Text>
              <View style={styles.issueRow}>
                {(fitPreview.issues.length > 0 ? fitPreview.issues : [{ code: "chest-loose", severity: "low", dimension: "overall", direction: "loose", deltaCm: 0, message: "No major fit issues surfaced for the recommended size." } as FitIssue]).slice(0, 3).map((issue) => (
                  <View key={`${issue.code}-${issue.message}`} style={[styles.issueChip, { backgroundColor: issueTone(issue) }]}>
                    <Text style={[styles.issueText, { color: issueTextColor(issue) }]}>{issue.message}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <EmptyState title="Fit preview unavailable" message="The fit engine could not score this garment yet." />
          )}
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.generatePanel}>
          <View style={styles.generateCopy}>
            <Text style={styles.generateTitle}>Generate try-on</Text>
            <Text style={styles.generateBody}>
              Works with an uploaded image, your saved profile photo, or demo photo in screenshot mode.
            </Text>
          </View>
          <ActionButton
            label={submitting ? "Generating..." : "Generate Try-On"}
            icon="star"
            onPress={() => void submit()}
            disabled={!canGenerate || submitting}
          />
        </View>
      </View>
    </Screen>
  );
}

function PreviewCard({
  title,
  subtitle,
  imageUri,
  emptyLabel
}: {
  title: string;
  subtitle: string;
  imageUri: string | null;
  emptyLabel: string;
}) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>{title}</Text>
      <Text style={styles.previewSubtitle}>{subtitle}</Text>
      <View style={styles.previewFrame}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <Text style={styles.previewEmpty}>{emptyLabel}</Text>}
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InfoChip({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <View style={[styles.infoChip, tone === "accent" && styles.infoChipAccent]}>
      <Text style={[styles.infoChipText, tone === "accent" && styles.infoChipTextAccent]}>{label}</Text>
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
  cameraPanel: {
    borderRadius: radius.xl,
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  cameraHeader: {
    gap: 8
  },
  sectionTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  inlineChips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  cameraStage: {
    minHeight: 280,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.heroStart,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  cameraImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  captureFrame: {
    width: 176,
    height: 212,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.6)"
  },
  cameraHint: {
    position: "absolute",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 28
  },
  cameraHintTitle: {
    color: colors.inkOnDark,
    fontSize: 15,
    fontWeight: "800"
  },
  cameraHintBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
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
  disabled: {
    opacity: 0.45
  },
  previewGrid: {
    flexDirection: "row",
    gap: 12
  },
  previewCard: {
    flex: 1,
    gap: 6,
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  previewSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  previewFrame: {
    height: 148,
    borderRadius: radius.md,
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
  panel: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  optionGrid: {
    gap: 10
  },
  optionCard: {
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  optionCardActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  optionTitleActive: {
    color: colors.accentStrong
  },
  optionSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  optionSubtitleActive: {
    color: colors.accentStrong
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panelStrong
  },
  segmentChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  segmentLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  segmentLabelActive: {
    color: colors.inkOnDark
  },
  productCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  productImage: {
    width: 88,
    height: 116,
    borderRadius: radius.lg,
    backgroundColor: colors.pageStrong
  },
  productCopy: {
    flex: 1,
    gap: 6
  },
  productTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  productBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
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
  fitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  fitSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  confidenceBadge: {
    minWidth: 58,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.panelMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: "800"
  },
  fitMetrics: {
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
  fitExplanation: {
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
    borderRadius: radius.pill
  },
  issueText: {
    fontSize: 12,
    fontWeight: "700"
  },
  errorText: {
    color: "#ffb8be",
    fontSize: 13,
    lineHeight: 19
  },
  generatePanel: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  generateCopy: {
    gap: 4
  },
  generateTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  generateBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  infoChipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  infoChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  infoChipTextAccent: {
    color: colors.accentStrong
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
