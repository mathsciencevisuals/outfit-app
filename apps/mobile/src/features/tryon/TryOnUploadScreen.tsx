import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { SegmentedControl } from "../../components/SegmentedControl";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

const fitStyles = ["balanced", "relaxed", "tailored"];

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

  const colorOptions = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[],
    [variants]
  );

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
    if (!selectedImage || !selectedVariant?.id || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await mobileApi.createTryOnFromAssets(userId, selectedVariant.id, {
        uri: selectedImage.uri,
        fileName: selectedImage.fileName,
        mimeType: selectedImage.mimeType
      }, {
        garmentAsset: selectedGarment
          ? {
              uri: selectedGarment.uri,
              fileName: selectedGarment.fileName,
              mimeType: selectedGarment.mimeType
            }
          : null,
        fitStyle,
        comparisonLabel: `${firstProduct?.name ?? "Look"} / ${selectedVariant.sizeLabel ?? "size"}`
      });

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
        subtitle="This flow now supports self-image upload, optional garment upload, fit style variation, and queued result polling."
      >
        <View style={styles.badgeRow}>
          <Pill label={firstProduct?.name ?? "Selected item"} tone="accent" />
          <Pill label={selectedImage ? "Self image ready" : "Self image needed"} tone={selectedImage ? "success" : "warning"} />
          <Pill label={selectedGarment ? "Garment override attached" : "Using catalog garment"} tone="neutral" />
        </View>
        <View style={styles.previewGrid}>
          <View style={styles.previewCard}>
            {selectedImage?.uri || profile?.avatarUrl ? <Image source={{ uri: selectedImage?.uri ?? profile?.avatarUrl ?? "" }} style={styles.previewImage} /> : null}
            <Text style={styles.previewTitle}>Self picture</Text>
            <Text style={styles.previewText}>
              {selectedImage?.fileName ?? (profile?.avatarUrl ? "Using your uploaded profile image until you replace it." : "Choose a clear front-facing source image.")}
            </Text>
            <PrimaryButton onPress={() => pickImage("self")} variant="secondary" size="sm">
              Select self image
            </PrimaryButton>
          </View>

          <View style={styles.previewCard}>
            {selectedGarment?.uri || selectedVariant.imageUrl || firstProduct?.imageUrl ? <Image source={{ uri: selectedGarment?.uri ?? selectedVariant.imageUrl ?? firstProduct?.imageUrl ?? "" }} style={styles.previewImage} /> : null}
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
        <SegmentedControl options={sizeOptions.length > 0 ? sizeOptions : ["Default"]} selected={selectedVariant.sizeLabel ?? sizeOptions[0]} onSelect={(value) => setSelectedVariantIndex(Math.max(0, sizeOptions.indexOf(value)))} />
        <Text style={styles.label}>Fit style</Text>
        <SegmentedControl options={fitStyles} selected={fitStyle} onSelect={setFitStyle} />

        <View style={styles.colorRow}>
          {colorOptions.map((color) => (
            <Pill key={color} label={color} tone={color === selectedVariant.color ? "success" : "neutral"} />
          ))}
        </View>

        <View style={styles.placeholderCard}>
          <Text style={styles.previewTitle}>Scan product</Text>
          <Text style={styles.previewText}>
            Product scan is not implemented yet, so the UI stays present but safely disabled instead of exposing a broken state.
          </Text>
          <PrimaryButton variant="ghost" disabled size="sm">
            Scan product coming soon
          </PrimaryButton>
        </View>

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <PrimaryButton onPress={submit} disabled={!selectedImage || submitting}>
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
  placeholderCard: {
    borderRadius: 22,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 16,
    gap: 10
  },
  error: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20
  }
});
