import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import type { Product } from "../../types/api";

export function DiscoverScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsyncResource(() => mobileApi.products(), []);
  const products = data ? data.slice(0, 5) : [];

  if (loading) return <Screen><SectionCard title="Discover"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Discover"><Text>Failed to load products.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Discover" subtitle="A fit-aware feed blended from catalog data and your preferences.">
        {products.map((product: Product) => (
          <View key={product.id}>
            <Text>{product.name}</Text>
            <Text>{product.brand?.name} · {product.category} · {product.baseColor}</Text>
          </View>
        ))}
        <PrimaryButton onPress={() => router.push("/tryon-upload")}>Start try-on</PrimaryButton>
      </SectionCard>
      <PrimaryButton onPress={() => router.push("/recommendations")}>View recommendations</PrimaryButton>
    </Screen>
  );
}
