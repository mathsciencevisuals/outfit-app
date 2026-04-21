import { Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import type { SavedLook } from "../../types/api";

export function SavedLooksScreen() {
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);
  const looks = data ?? [];

  if (loading) return <Screen><SectionCard title="Saved looks"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Saved looks"><Text>Failed to load saved looks.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Saved looks" subtitle="Curated outfits you can revisit after try-on and shop comparison.">
        {looks.map((look: SavedLook) => (
          <View key={look.id}>
            <Text>{look.name}</Text>
            <Text>{look.note ?? "No note"}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}
