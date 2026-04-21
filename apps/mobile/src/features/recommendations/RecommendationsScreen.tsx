import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { Recommendation } from "../../types/api";

export function RecommendationsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(async () => {
    const results = await mobileApi.recommendations(userId);
    return results.length > 0 ? results : mobileApi.generateRecommendations(userId);
  }, [userId]);

  const recommendations = data ?? [];

  if (loading) return <Screen><SectionCard title="Recommendations"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Recommendations"><Text>Failed to load recommendations.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Recommendations" subtitle="Ranked by fit score, color compatibility, and style preference.">
        {recommendations.map((item: Recommendation) => (
          <View key={item.id ?? item.productId}>
            <Text>{item.product?.name ?? item.productId}</Text>
            <Text>Score {Math.round(item.score)} · {item.explanation}</Text>
          </View>
        ))}
        <PrimaryButton onPress={() => router.push("/shops")}>Compare shops</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
