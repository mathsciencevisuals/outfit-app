import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import type { Shop } from "../../types/api";

export function ShopsScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsyncResource(() => mobileApi.shops(), []);
  const shops = data ?? [];

  if (loading) return <Screen><SectionCard title="Shops"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Shops"><Text>Failed to load shops.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Shops" subtitle="Availability and offer comparison across retail partners.">
        {shops.map((shop: Shop) => (
          <View key={shop.id}>
            <Text>{shop.name}</Text>
            <Text>{shop.region} · {(shop.inventoryOffers ?? []).length} offers</Text>
          </View>
        ))}
        <PrimaryButton onPress={() => router.push("/saved-looks")}>Go to saved looks</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
