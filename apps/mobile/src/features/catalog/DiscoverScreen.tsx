import { Feather } from "@expo/vector-icons";
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

export function DiscoverScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);
  const logout = useAppStore((state) => state.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data } = useAsyncResource(async () => {
    const [recommendations, wallet] = await Promise.all([
      mobileApi.recommendations(userId),
      mobileApi.rewardWallet().catch(() => demoData.rewardWallet)
    ]);
    return { recommendations, wallet };
  }, [userId]);

  const recommendations = data?.recommendations?.length ? data.recommendations.slice(0, 8) : demoData.recommendations.slice(0, 8);
  const wallet = data?.wallet ?? demoData.rewardWallet;
  const heroProduct = recommendations[0]?.product ?? demoData.products[0];
  const styleDNA = useMemo(() => {
    const occasions = Array.isArray(profile?.stylePreference?.occasions) ? profile?.stylePreference?.occasions.join(" • ") : "Casual • Formal";
    return `${occasions} • ${profile?.fitPreference ?? "regular"} fit • ${profile?.budgetLabel ?? "Mid-Range"}`;
  }, [profile?.budgetLabel, profile?.fitPreference, profile?.stylePreference]);

  const menuItems = [
    { label: "Measurements", route: "/measurements" },
    { label: "Style Preferences", route: "/style-preferences" },
    { label: "Budget", route: "/budget" },
    { label: "Try-On Result", route: "/tryon-result" }
  ];

  const profileItems = [
    { label: "Open Profile", route: "/account" },
    { label: "Settings / Theme", route: "/account" }
  ];

  const navigate = (route: string) => {
    setMenuOpen(false);
    setProfileOpen(false);
    router.push(route as never);
  };

  const signOut = async () => {
    await logout();
    router.replace("/auth");
  };

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.topBar}>
          <Pressable onPress={() => setMenuOpen((value) => !value)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="menu" size={18} color={colors.inkOnDark} />
          </Pressable>
          <View style={styles.topBarCopy}>
            <Text style={styles.topBarEyebrow}>fitme.ai</Text>
            <Text style={styles.topBarTitle}>Feed</Text>
          </View>
          <Pressable onPress={() => setProfileOpen((value) => !value)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="settings" size={18} color={colors.inkOnDark} />
          </Pressable>
        </View>

        {menuOpen ? (
          <View style={styles.overlayCard}>
            {menuItems.map((item) => (
              <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.overlayRow, pressed && styles.pressed]}>
                <Text style={styles.overlayText}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.inkOnDarkSoft} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {profileOpen ? (
          <View style={styles.overlayCard}>
            {profileItems.map((item) => (
              <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.overlayRow, pressed && styles.pressed]}>
                <Text style={styles.overlayText}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.inkOnDarkSoft} />
              </Pressable>
            ))}
            <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.overlayRow, pressed && styles.pressed]}>
              <Text style={[styles.overlayText, { color: "#fda4af" }]}>Logout</Text>
              <Feather name="log-out" size={16} color="#fda4af" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <SmartImage uri={heroProduct.imageUrl} label={heroProduct.name} containerStyle={styles.heroImageWrap} style={styles.heroImage} fallbackTone="accent" />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>AI Style DNA</Text>
            <Text style={styles.heroTitle}>{styleDNA}</Text>
            <Text style={styles.heroBody}>Your feed is blending measurements, fit preference, color taste, and budget signals into a single fashion-tech shortlist.</Text>
            <View style={styles.heroBadgeRow}>
              <InfoBadge label={`${wallet.balancePoints} pts`} />
              <InfoBadge label={`${recommendations.length} picks`} />
              <InfoBadge label={profile?.budgetLabel ?? "Mid-Range"} />
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="camera" label="Try-On" onPress={() => navigate("/try-on")} />
          <QuickAction icon="bookmark" label="Saved" onPress={() => navigate("/saved")} />
          <QuickAction icon="shopping-bag" label="Shops" onPress={() => navigate("/retail")} />
        </View>

        <View style={styles.recommendationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>For You</Text>
            <Text style={styles.sectionSubtitle}>Real cards, visible product imagery, and screenshot-ready metrics.</Text>
          </View>

          {recommendations.map((entry) => {
            const price = Math.round(entry.product?.variants?.[1]?.price ?? entry.product?.variants?.[0]?.price ?? 0);
            return (
              <View key={entry.productId} style={styles.recommendationCard}>
                <SmartImage
                  uri={entry.product?.imageUrl}
                  label={entry.product?.name ?? "Recommended"}
                  containerStyle={styles.recommendationThumbWrap}
                  style={styles.recommendationThumb}
                />
                <View style={styles.recommendationCopy}>
                  <View style={styles.recommendationTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recommendationName}>{entry.product?.name ?? "Recommended product"}</Text>
                      <Text style={styles.recommendationMeta}>
                        {entry.product?.brand?.name ?? "FitMe"} · INR {price}
                      </Text>
                    </View>
                    <View style={styles.matchPill}>
                      <Text style={styles.matchPillText}>{Math.round(entry.score)}%</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationReason} numberOfLines={2}>
                    {entry.explanation ?? "Built from fit, style, and budget signals."}
                  </Text>
                  <View style={styles.recommendationActions}>
                    <PrimaryButton onPress={() => navigate("/try-on")} size="sm" variant="secondary">
                      Try-On
                    </PrimaryButton>
                    <PrimaryButton onPress={() => navigate("/retail")} size="sm">
                      Buy
                    </PrimaryButton>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
      <View style={styles.quickIcon}>
        <Feather name={icon} size={18} color={colors.inkOnDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function InfoBadge({ label }: { label: string }) {
  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  topBarCopy: {
    alignItems: "center",
    gap: 2
  },
  topBarEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  topBarTitle: {
    color: colors.inkOnDark,
    fontSize: 20,
    fontWeight: "800"
  },
  overlayCard: {
    gap: 8,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.94)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  overlayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  overlayText: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "700"
  },
  heroCard: {
    position: "relative",
    borderRadius: radius.xl,
    overflow: "hidden",
    minHeight: 320,
    backgroundColor: colors.heroEnd
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
    backgroundColor: "rgba(9,11,20,0.45)"
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 10,
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
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800"
  },
  heroBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  infoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  infoBadgeText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "700"
  },
  quickRow: {
    flexDirection: "row",
    gap: 10
  },
  quickCard: {
    flex: 1,
    gap: 10,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  quickLabel: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: "700"
  },
  recommendationSection: {
    gap: 12
  },
  sectionHeader: {
    gap: 4
  },
  sectionTitle: {
    color: colors.inkOnDark,
    fontSize: 22,
    fontWeight: "800"
  },
  sectionSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  recommendationCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  recommendationThumbWrap: {
    width: 92,
    height: 120
  },
  recommendationThumb: {
    width: "100%",
    height: "100%"
  },
  recommendationCopy: {
    flex: 1,
    gap: 8
  },
  recommendationTopRow: {
    flexDirection: "row",
    gap: 10
  },
  recommendationName: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  recommendationMeta: {
    color: colors.inkOnDarkSoft,
    fontSize: 12
  },
  matchPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  matchPillText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800"
  },
  recommendationReason: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  recommendationActions: {
    flexDirection: "row",
    gap: 8
  },
  pressed: {
    opacity: 0.92
  }
});
