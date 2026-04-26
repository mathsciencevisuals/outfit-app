import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { demoData } from "../../demo/demo-data";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

export function RecommendationsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data } = useAsyncResource(() => mobileApi.recommendations(userId), [userId]);

  const recommendations = data && data.length > 0 ? data.slice(0, 8) : demoData.recommendations.slice(0, 8);

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>For You</Text>
          <Text style={styles.subtitle}>Based on your style, fit profile, and current budget.</Text>
        </View>

        {recommendations.map((entry) => {
          const product = entry.product ?? demoData.products[0];
          const price = Math.round(product.variants?.[1]?.price ?? product.variants?.[0]?.price ?? 0);
          return (
            <View key={entry.productId} style={styles.card}>
              <SmartImage uri={product.imageUrl} label={product.name} containerStyle={styles.imageWrap} style={styles.image} />
              <View style={styles.copy}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.meta}>
                      {product.brand?.name ?? "FitMe"} · INR {price}
                    </Text>
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{Math.round(entry.score)}%</Text>
                  </View>
                </View>
                <Text style={styles.reason} numberOfLines={2}>
                  {entry.explanation ?? "Built from fit, color, and style signals."}
                </Text>
                <View style={styles.actions}>
                  <PrimaryButton onPress={() => router.push("/try-on")} size="sm" variant="secondary">
                    Try-On
                  </PrimaryButton>
                  <PrimaryButton onPress={() => router.push("/retail")} size="sm">
                    Buy
                  </PrimaryButton>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 14
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
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  imageWrap: {
    width: 100,
    height: 126
  },
  image: {
    width: "100%",
    height: "100%"
  },
  copy: {
    flex: 1,
    gap: 8
  },
  topRow: {
    flexDirection: "row",
    gap: 8
  },
  name: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  meta: {
    color: colors.inkOnDarkSoft,
    fontSize: 12
  },
  matchBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  matchText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800"
  },
  reason: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  actions: {
    flexDirection: "row",
    gap: 8
  }
});
