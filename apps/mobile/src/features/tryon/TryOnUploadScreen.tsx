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
  { id: "cyberpunk-city", title: "Cyberpunk City", subtitle: "Sharper glow, moodier contrast." },
  { id: "cozy-coffee-shop", title: "Coffee Shop", subtitle: "Softer indoor warmth and casual framing." },
  { id: "y2k-studio", title: "Y2K Studio", subtitle: "Cleaner flash, brighter pop, more playful tone." }
] as const;

function fitTone(fitLabel?: string | null) {
  if (fitLabel === "slim") {
    return "accent" as const;
  }
  if (fitLabel === "relaxed") {
    return "info" as const;
  }
  return "neutral" as const;
}

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

  const featuredProduct = data?.[0];
  const variants = featuredProduct?.variants ?? [];
  const selectedVariant = variants[selectedVariantIndex] ?? variants[0];
  const sizeOptions = variants.map((variant) => variant.sizeLabel ?? "One size");
  const selfImageUri = selectedImage?.uri ?? profile?.avatarUrl ?? null;
  const garmentImageUri = selectedGarment?.uri ?? selectedVariant?.imageUrl ?? featuredProduct?.imageUrl ?? null;
  const comparisonLabel = `${vibes.find((entry) => entry.id === vibe)?.title ?? "Scene"} / ${featuredProduct?.name ?? "Look"} / ${selectedVariant?.sizeLabel ?? "M"}`;

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

  const colorOptions = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[],
    [variants]
  );

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
        throw new Error("Select a self image or use your saved profile photo first.");
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
      <Screen tone="dark">
        <LoadingState title="Try-On" subtitle="Preparing camera, catalog, and fit preview context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark">
        <ErrorState title="Try-On" message="The try-on screen could not load product context." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (!selectedVariant?.id) {
    return (
      <Screen tone="dark">
        <EmptyState title="No try-on garment available" message="The catalog does not currently expose a garment variant for try-on." actionLabel="Shops" onAction={() => router.push("/retail")} />
      </Screen>
    );
  }

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="Try-On"
        title="Capture fit"
        subtitle="Photo, garment, and scene vibe all live in one stage before the request is created."
      >
        <View style={styles.appbar}>
          <Pressable onPress={() => void pickImage("self", "camera")} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="camera" size={18} color={colors.inkOnDark} />
          </Pressable>
          <View style={styles.appbarCopy}>
            <Text style={styles.appbarTitle}>Capture fit</Text>
            <Text style={styles.appbarText}>Photo, garment, vibe.</Text>
          </View>
          <Pressable onPress={() => void pickImage("self", "library")} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="upload" size={18} color={colors.inkOnDark} />
          </Pressable>
        </View>

        <View style={styles.cameraStage}>
          {selfImageUri ? <Image source={{ uri: selfImageUri }} style={styles.cameraImage} /> : null}
          <View style={styles.frame} />
          {!selfImageUri ? (
            <View style={styles.cameraHint}>
              <Feather name="image" size={22} color={colors.inkOnDarkSoft} />
              <Text style={styles.cameraHintText}>Start camera or upload a photo.</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={() => void pickImage("self", "camera")} variant="secondary">
            Start camera
          </PrimaryButton>
          <PrimaryButton onPress={() => void pickImage("self", "camera")} variant="secondary">
            Capture
          </PrimaryButton>
          <PrimaryButton onPress={() => void pickImage("self", "library")}>Upload</PrimaryButton>
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.previewCard}>
            {selfImageUri ? <Image source={{ uri: selfImageUri }} style={styles.previewImage} /> : <Text style={styles.previewEmpty}>Your photo</Text>}
          </View>
          <Pressable onPress={() => void pickImage("garment", "library")} style={({ pressed }) => [styles.previewCard, pressed && styles.pressed]}>
            {garmentImageUri ? <Image source={{ uri: garmentImageUri }} style={styles.previewImage} /> : <Text style={styles.previewEmpty}>Garment</Text>}
          </Pressable>
        </View>

        <View style={styles.configPanel}>
          <Text style={styles.sectionTitle}>Scene vibe</Text>
          <Text style={styles.sectionText}>{vibes.find((entry) => entry.id === vibe)?.title ?? "Scene vibe"}</Text>
          <View style={styles.vibeRow}>
            {vibes.map((entry) => {
              const active = entry.id === vibe;
              return (
                <Pressable key={entry.id} onPress={() => setVibe(entry.id)} style={({ pressed }) => [styles.vibeChip, active && styles.vibeChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.vibeChipTitle, active && styles.vibeChipTitleActive]}>{entry.title}</Text>
                </Pressable>
              );
            })}
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

        <View style={styles.chips}>
          {colorOptions.map((color) => (
            <Pill key={color} label={color} tone={color === selectedVariant.color ? "success" : "neutral"} />
          ))}
        </View>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={submit} disabled={submitting || !selfImageUri}>
            {submitting ? "Generating..." : "Generate"}
          </PrimaryButton>
          <PrimaryButton onPress={() => router.push("/retail")} variant="secondary">
            Scan product
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard
        tone="dark"
        eyebrow="Fit Preview"
        title="Recommended size before render"
        subtitle="The current try-on request is still grounded in fit intelligence, not just image generation."
      >
        {fitLoading ? (
          <LoadingState title="Fit preview" subtitle="Scoring the selected garment against your profile." />
        ) : fitPreview ? (
          <>
            <View style={styles.metrics}>
              <MetricTile label="Best size" value={fitPreview.recommendedSize ?? "--"} caption="Current recommendation" />
              <MetricTile label="Fit" value={fitPreview.fitLabel} caption="Likely silhouette" />
              <MetricTile label="Confidence" value={`${Math.round(fitPreview.confidenceScore * 100)}%`} caption="Fit confidence" />
            </View>
            <View style={styles.chips}>
              <Pill label={`${fitPreview.fitLabel} fit`} tone={fitTone(fitPreview.fitLabel)} />
              <Pill label={`${Math.round(fitPreview.confidenceScore * 100)}% confidence`} tone={confidenceTone(fitPreview.confidenceScore)} />
            </View>
            <Text style={styles.fitBody}>{fitPreview.explanation}</Text>
            <View style={styles.chips}>
              {fitPreview.issues.slice(0, 3).map((issue) => (
                <Pill key={issue.code} label={issue.message} tone={issueTone(issue)} />
              ))}
            </View>
          </>
        ) : (
          <EmptyState title="Fit preview unavailable" message="The fit engine could not score this garment yet." />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  appbarCopy: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  appbarTitle: {
    color: colors.inkOnDark,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "800"
  },
  appbarText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 17
  },
  cameraStage: {
    minHeight: 238,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "#1b2440",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined
  },
  frame: {
    width: 168,
    height: 198,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.58)",
    borderStyle: "dashed",
    zIndex: 2
  },
  cameraHint: {
    position: "absolute",
    alignItems: "center",
    gap: 8
  },
  cameraHintText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12
  },
  buttonRow: {
    flexDirection: "row",
    gap: 9
  },
  previewGrid: {
    flexDirection: "row",
    gap: 10
  },
  previewCard: {
    flex: 1,
    height: 116,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  previewEmpty: {
    color: colors.inkOnDarkSoft,
    fontSize: 12
  },
  configPanel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 8
  },
  sectionTitle: {
    color: colors.inkOnDark,
    fontSize: 14.5,
    fontWeight: "800"
  },
  sectionText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  vibeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  vibeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  vibeChipActive: {
    backgroundColor: "rgba(109,94,252,0.28)",
    borderColor: "rgba(109,94,252,0.46)"
  },
  vibeChipTitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  vibeChipTitleActive: {
    color: colors.inkOnDark
  },
  label: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800"
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  errorText: {
    color: "#ffb4bf",
    fontSize: 12,
    lineHeight: 18
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  fitBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.9
  }
});
