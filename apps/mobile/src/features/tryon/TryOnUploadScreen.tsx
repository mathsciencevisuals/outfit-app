import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { demoData } from "../../demo/demo-data";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import { demoModeEnabled } from "../../utils/env";

export function TryOnUploadScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);
  const setLastTryOnRequestId = useAppStore((state) => state.setLastTryOnRequestId);
  const { data } = useAsyncResource(() => mobileApi.products(), []);

  const [tab, setTab] = useState<"store" | "photo">("store");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const products = data && data.length > 0 ? data : demoData.products;
  const selectedProduct = products.find((entry) => entry.id === selectedProductId) ?? products[0];
  const selectedVariant = selectedProduct?.variants?.[1] ?? selectedProduct?.variants?.[0];
  const previewPhoto = photo?.uri ?? profile?.avatarUrl ?? (demoModeEnabled ? demoData.tryOnRequest.sourceUpload?.publicUrl : null);

  const storeProducts = useMemo(() => products.slice(0, 8), [products]);

  const pickImage = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage(source === "camera" ? "Camera permission is required." : "Photo library permission is required.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (!result.canceled) {
      setPhoto(result.assets[0] ?? null);
      setMessage(null);
    }
  };

  const startStoreTryOn = async (productId?: string) => {
    const product = products.find((entry) => entry.id === (productId ?? selectedProduct?.id)) ?? selectedProduct;
    const variant = product?.variants?.[1] ?? product?.variants?.[0];
    if (!product || !variant) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const request = profile?.avatarUploadId
        ? await mobileApi.createTryOn(userId, variant.id, {
            uploadId: profile.avatarUploadId,
            fitStyle: profile.fitPreference ?? "regular",
            comparisonLabel: product.name
          })
        : await mobileApi.createTryOn(userId, variant.id, {
            imageUrl: demoData.tryOnRequest.sourceUpload?.publicUrl,
            fitStyle: profile?.fitPreference ?? "regular",
            comparisonLabel: product.name
          });

      setLastTryOnRequestId(request.id);
      router.push({ pathname: "/processing" as never, params: { item: product.name } } as never);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not start try-on.");
    } finally {
      setSubmitting(false);
    }
  };

  const startPhotoTryOn = async () => {
    if (!selectedVariant) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const request = photo
        ? await mobileApi.createTryOnFromAssets(
            userId,
            selectedVariant.id,
            {
              uri: photo.uri,
              fileName: photo.fileName,
              mimeType: photo.mimeType
            },
            {
              fitStyle: profile?.fitPreference ?? "regular",
            comparisonLabel: selectedProduct?.name ?? undefined
          }
        )
        : await mobileApi.createTryOn(userId, selectedVariant.id, {
            uploadId: profile?.avatarUploadId ?? undefined,
            imageUrl: demoData.tryOnRequest.sourceUpload?.publicUrl,
            fitStyle: profile?.fitPreference ?? "regular",
            comparisonLabel: selectedProduct?.name ?? undefined
          });

      setLastTryOnRequestId(request.id);
      router.push({ pathname: "/processing" as never, params: { item: selectedProduct?.name ?? "your look" } } as never);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not start photo try-on.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Try-On Studio</Text>
          <Text style={styles.subtitle}>See how clothes look on you before you buy.</Text>
        </View>

        <View style={styles.tabRow}>
          <TabButton label="From Store" active={tab === "store"} onPress={() => setTab("store")} />
          <TabButton label="From Photo" active={tab === "photo"} onPress={() => setTab("photo")} />
        </View>

        {tab === "store" ? (
          <View style={styles.grid}>
            {storeProducts.map((product) => (
              <Pressable key={product.id} onPress={() => setSelectedProductId(product.id)} style={({ pressed }) => [styles.productCard, selectedProduct?.id === product.id && styles.productCardSelected, pressed && styles.pressed]}>
                <SmartImage
                  uri={product.imageUrl}
                  label={product.name}
                  containerStyle={styles.productImageWrap}
                  style={styles.productImage}
                  fallbackTone="accent"
                />
                <View style={styles.productCopy}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productMeta}>
                    {product.brand?.name ?? "FitMe"} · Rs. {Math.round(product.variants?.[1]?.price ?? product.variants?.[0]?.price ?? 0)}
                  </Text>
                  <PrimaryButton onPress={() => void startStoreTryOn(product.id)} size="sm">
                    Try-On
                  </PrimaryButton>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.photoCard}>
            <SmartImage
              uri={previewPhoto}
              label="Your try-on photo"
              containerStyle={styles.photoPreviewWrap}
              style={styles.photoPreview}
            />
            <Text style={styles.photoTitle}>Upload or capture your photo</Text>
            <Text style={styles.photoBody}>Use camera, gallery, your saved profile photo, or demo mode so the flow never dead-ends.</Text>
            <View style={styles.buttonRow}>
              <PrimaryButton onPress={() => void pickImage("camera")} variant="secondary">
                Camera
              </PrimaryButton>
              <PrimaryButton onPress={() => void pickImage("library")} variant="secondary">
                Upload
              </PrimaryButton>
            </View>
            <PrimaryButton onPress={() => void startPhotoTryOn()} disabled={submitting}>
              {submitting ? "Starting..." : "Create Try-On"}
            </PrimaryButton>
          </View>
        )}

        {selectedProduct ? (
          <View style={styles.selectionCard}>
            <Text style={styles.selectionEyebrow}>Selected piece</Text>
            <Text style={styles.selectionTitle}>{selectedProduct.name}</Text>
            <Text style={styles.selectionBody}>
              {selectedProduct.brand?.name ?? "FitMe"} · Rs. {Math.round(selectedVariant?.price ?? 0)} · Size {selectedVariant?.sizeLabel ?? "M"}
            </Text>
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tabButton, active && styles.tabButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  header: {
    gap: 4
  },
  title: {
    color: colors.inkOnDark,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg
  },
  tabButtonActive: {
    backgroundColor: colors.accent
  },
  tabButtonText: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    fontWeight: "700"
  },
  tabButtonTextActive: {
    color: colors.inkOnDark
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  productCard: {
    width: "47%",
    gap: 10,
    padding: 10,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  productCardSelected: {
    borderColor: colors.accent
  },
  productImageWrap: {
    aspectRatio: 0.76
  },
  productImage: {
    width: "100%",
    height: "100%"
  },
  productCopy: {
    gap: 6
  },
  productTitle: {
    color: colors.inkOnDark,
    fontSize: 15,
    fontWeight: "700"
  },
  productMeta: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  photoCard: {
    gap: 14,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  photoPreviewWrap: {
    aspectRatio: 0.78
  },
  photoPreview: {
    width: "100%",
    height: "100%"
  },
  photoTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "700"
  },
  photoBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  selectionCard: {
    gap: 4,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.24)"
  },
  selectionEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  selectionTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  selectionBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  message: {
    color: "#fda4af",
    fontSize: 14
  },
  pressed: {
    opacity: 0.92
  }
});
