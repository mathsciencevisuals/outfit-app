import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

const uploadChecks = [
  "Use a clear front-facing photo",
  "Keep the body visible edge to edge",
  "Avoid heavy shadows and mirrors"
];

export function TryOnUploadScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const setLastTryOnRequestId = useAppStore((state) => state.setLastTryOnRequestId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstProduct = data?.[0];
  const firstVariantId = firstProduct?.variants?.[0]?.id ?? "";

  const pickImage = async () => {
    setSubmitError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0] ?? null);
    }
  };

  const submit = async () => {
    if (!selectedImage || !firstVariantId || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await mobileApi.createTryOnFromAsset(userId, firstVariantId, {
        uri: selectedImage.uri,
        fileName: selectedImage.fileName,
        mimeType: selectedImage.mimeType
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
        <LoadingState title="Try-on upload" subtitle="Preparing upload and product context." />
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

  if (!firstVariantId) {
    return (
      <Screen>
        <EmptyState
          title="No try-on item available"
          message="The catalog currently has no variant ready for the try-on entry flow."
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
        title="Upload your look"
        subtitle="Your image is sent through the API-backed upload pipeline before the generation request is queued."
      >
        <View style={styles.badgeRow}>
          <Pill label={firstProduct?.name ?? "Selected item"} tone="accent" />
          <Pill label={selectedImage ? "Photo attached" : "Awaiting upload"} tone={selectedImage ? "success" : "warning"} />
        </View>
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{selectedImage?.fileName ?? "No image selected yet"}</Text>
          <Text style={styles.previewText}>
            {selectedImage
              ? "This file is ready to upload, store, and enqueue for processing."
              : "Choose a strong source image before you generate the try-on preview."}
          </Text>
        </View>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <PrimaryButton onPress={pickImage} variant="secondary">
          Pick photo
        </PrimaryButton>
        <PrimaryButton onPress={submit} disabled={!selectedImage || submitting}>
          {submitting ? "Uploading and queueing..." : "Generate try-on"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Capture Guide" title="Photo quality checklist">
        {uploadChecks.map((item) => (
          <View key={item} style={styles.checkRow}>
            <View style={styles.checkDot} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
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
  previewCard: {
    borderRadius: 22,
    backgroundColor: "#f6efe5",
    borderWidth: 1,
    borderColor: "#e6d7c0",
    minHeight: 150,
    padding: 16,
    justifyContent: "flex-end",
    gap: 8
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
  error: {
    color: "#b42318",
    fontSize: 14,
    lineHeight: 20
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#172033"
  },
  checkText: {
    flex: 1,
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  }
});
