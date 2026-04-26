import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { demoData } from "../../demo/demo-data";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { SavedLook } from "../../types/api";

const categories = ["All", "Jackets", "Shirts", "Pants", "Shoes"] as const;

function lookCategory(look: SavedLook) {
  const productCategory = look.items?.[0]?.product?.category ?? look.recommendedProducts?.[0]?.category ?? "";
  if (productCategory.includes("jacket")) return "Jackets";
  if (productCategory.includes("shirt") || productCategory.includes("top")) return "Shirts";
  if (productCategory.includes("pant") || productCategory.includes("bottom")) return "Pants";
  if (productCategory.includes("shoe") || productCategory.includes("footwear")) return "Shoes";
  return "All";
}

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);

  const [filter, setFilter] = useState<(typeof categories)[number]>("All");
  const [looks, setLooks] = useState<SavedLook[]>([]);

  useEffect(() => {
    setLooks(data && data.length > 0 ? data : demoData.savedLooks);
  }, [data]);

  const filteredLooks = useMemo(
    () => looks.filter((entry) => filter === "All" || lookCategory(entry) === filter),
    [filter, looks]
  );

  const removeLook = (id: string) => {
    setLooks((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Wardrobe</Text>
          <Text style={styles.subtitle}>{looks.length} saved items</Text>
        </View>

        <View style={styles.filterRow}>
          {categories.map((entry) => (
            <Pressable key={entry} onPress={() => setFilter(entry)} style={({ pressed }) => [styles.filterChip, filter === entry && styles.filterChipSelected, pressed && styles.pressed]}>
              <Text style={[styles.filterText, filter === entry && styles.filterTextSelected]}>{entry}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          {filteredLooks.map((look) => {
            const product = look.items?.[0]?.product ?? look.recommendedProducts?.[0] ?? demoData.products[0];
            return (
              <View key={look.id} style={styles.card}>
                <SmartImage uri={product.imageUrl} label={product.name} containerStyle={styles.imageWrap} style={styles.image} />
                <Pressable onPress={() => removeLook(look.id)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {look.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  {product.brand?.name ?? "FitMe"} · INR {Math.round(product.variants?.[1]?.price ?? product.variants?.[0]?.price ?? 0)}
                </Text>
              </View>
            );
          })}
        </View>

        {filteredLooks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved items for this filter</Text>
            <PrimaryButton onPress={() => router.push("/try-on")} variant="secondary">
              Create a new look
            </PrimaryButton>
          </View>
        ) : null}
      </View>
    </Screen>
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  filterChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  filterText: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    fontWeight: "700"
  },
  filterTextSelected: {
    color: colors.inkOnDark
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  card: {
    width: "47%",
    gap: 8,
    padding: 10,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  imageWrap: {
    aspectRatio: 0.76
  },
  image: {
    width: "100%",
    height: "100%"
  },
  removeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  removeText: {
    color: "#fda4af",
    fontSize: 12,
    fontWeight: "700"
  },
  cardTitle: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "700"
  },
  cardMeta: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  emptyCard: {
    gap: 12,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  emptyTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.92
  }
});
