import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function TryOnUploadScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const setLastTryOnRequestId = useAppStore((state) => state.setLastTryOnRequestId);
  const { data } = useAsyncResource(() => mobileApi.products(), []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const firstVariantId = data?.[0]?.variants?.[0]?.id ?? "";

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]?.uri ?? null);
    }
  };

  const submit = async () => {
    if (!selectedImage || !firstVariantId) return;
    const created = await mobileApi.createTryOn(userId, firstVariantId, selectedImage);
    setLastTryOnRequestId(created.id);
    router.push("/tryon-result");
  };

  return (
    <Screen>
      <SectionCard title="Try-on upload" subtitle="Choose a clean front-facing photo to generate a preview.">
        <Text>{selectedImage ? `Selected: ${selectedImage}` : "No image selected yet."}</Text>
        <PrimaryButton onPress={pickImage}>Pick photo</PrimaryButton>
        <PrimaryButton onPress={submit}>Generate try-on</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
