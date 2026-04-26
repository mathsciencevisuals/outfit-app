import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { demoData } from "../../demo/demo-data";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

export function ShopsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data } = useAsyncResource(async () => {
    const recommendations = await mobileApi.recommendations(userId);
    const productId = recommendations[0]?.productId ?? demoData.products[0].id;
    return mobileApi.shopComparison({ productId });
  }, [userId]);

  const comparison = data ?? demoData.shopComparison(demoData.products[0].id);
  const offers = comparison.offers.slice(0, 4);
  const product = offers[0]?.variant?.product ?? demoData.products[0];

  const saveProduct = async () => {
    await mobileApi.saveLook(userId, {
      name: `${product.name} wishlist`,
      note: "Saved from Complete the Look.",
      productIds: [product.id],
      isWishlist: true
    });
    router.push("/saved");
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          <SmartImage uri={product.imageUrl} label={product.name} containerStyle={styles.heroImageWrap} style={styles.heroImage} fallbackTone="warm" />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Shops</Text>
            <Text style={styles.heroTitle}>Complete the Look</Text>
            <Text style={styles.heroBody}>Compare retailers, fit/vibe badges, and a clean external handoff without blank placeholders.</Text>
          </View>
        </View>

        {offers.map((offer, index) => (
          <View key={offer.id} style={styles.offerCard}>
            <SmartImage
              uri={offer.variant?.imageUrl ?? product.imageUrl}
              label={offer.variant?.product?.name ?? product.name}
              containerStyle={styles.offerImageWrap}
              style={styles.offerImage}
              fallbackTone={index % 2 === 0 ? "accent" : "warm"}
            />
            <View style={styles.offerCopy}>
              <Text style={styles.offerTitle}>{offer.variant?.product?.name ?? product.name}</Text>
              <Text style={styles.offerMeta}>
                {offer.shop?.name ?? "Retailer"} · INR {Math.round(offer.price)}
              </Text>
              <View style={styles.badgeRow}>
                <Badge label={comparison.badges[0] ?? "Best Price"} />
                <Badge label={comparison.badges[1] ?? "Best Fit"} />
                <Badge label="Vibe Match" />
              </View>
              <View style={styles.buttonRow}>
                <PrimaryButton onPress={() => Linking.openURL(offer.externalUrl)} size="sm">
                  Open Retailer
                </PrimaryButton>
                <PrimaryButton onPress={() => void saveProduct()} size="sm" variant="secondary">
                  Save Product
                </PrimaryButton>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  heroCard: {
    position: "relative",
    borderRadius: radius.xl,
    overflow: "hidden",
    minHeight: 260
  },
  heroImageWrap: {
    ...StyleSheet.absoluteFillObject
  },
  heroImage: {
    width: "100%",
    height: "100%"
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9,11,20,0.5)"
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 8,
    padding: 20
  },
  heroEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800"
  },
  heroBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  offerCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  offerImageWrap: {
    width: 96,
    height: 124
  },
  offerImage: {
    width: "100%",
    height: "100%"
  },
  offerCopy: {
    flex: 1,
    gap: 8
  },
  offerTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  offerMeta: {
    color: colors.inkOnDarkSoft,
    fontSize: 13
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  badgeText: {
    color: colors.inkOnDark,
    fontSize: 11,
    fontWeight: "700"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8
  }
});
