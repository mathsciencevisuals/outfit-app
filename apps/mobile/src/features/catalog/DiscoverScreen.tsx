import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { Recommendation } from "../../types/api";

function formatPrice(value?: number | null) {
  return value != null ? `$${Math.round(value)}` : "Price pending";
}

function checklist(profileReady: boolean, measurementReady: boolean, savedLooksCount: number) {
  return [
    {
      id: "photo",
      title: profileReady ? "Profile image ready" : "Profile photo missing",
      detail: profileReady ? "Your saved avatar can be reused for try-on and profile surfaces." : "Upload a profile photo so try-on can start without manual re-selection.",
      tone: profileReady ? "success" : "warning"
    },
    {
      id: "measurements",
      title: measurementReady ? "Measurements synced" : "Measurements need a refresh",
      detail: measurementReady ? "Fit confidence has enough data to rank sizes and issues." : "Add chest, waist, hips, shoulder, and inseam to improve fit guidance.",
      tone: measurementReady ? "success" : "warning"
    },
    {
      id: "saved",
      title: savedLooksCount > 0 ? "Wardrobe memory active" : "No saved looks yet",
      detail: savedLooksCount > 0 ? "Saved looks can now shape recommendations and shop handoff." : "Save one try-on result or wishlist to strengthen recommendations.",
      tone: savedLooksCount > 0 ? "accent" : "info"
    }
  ] as const;
}

export function DiscoverScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const userRole = useAppStore((state) => state.userRole);
  const profile = useAppStore((state) => state.profile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const { data, loading, error } = useAsyncResource(
    async () => {
      const [recommendations, wallet, campaigns] = await Promise.all([
        mobileApi.recommendations(userId),
        mobileApi.rewardWallet().catch(() => null),
        mobileApi.campaigns().catch(() => [])
      ]);

      return {
        recommendations,
        wallet,
        campaigns
      };
    },
    [userId]
  );

  const recommendations = data?.recommendations ?? [];
  const featured = recommendations[0] ?? null;
  const campaign = data?.campaigns?.[0] ?? null;
  const wardrobeCount = profile?.savedLooks?.length ?? 0;
  const measurementReady = Boolean(profile?.measurements?.[0]);
  const tasks = checklist(Boolean(profile?.avatarUrl), measurementReady, wardrobeCount);
  const adminVisible = userRole === "ADMIN" || userRole === "OPERATOR";
  const likedStyle = useMemo(() => {
    const styles = Array.isArray(profile?.stylePreference?.preferredStyles)
      ? (profile?.stylePreference?.preferredStyles as string[])
      : [];
    return styles.slice(0, 2).join(" • ") || "Style DNA pending";
  }, [profile?.stylePreference]);

  if (loading) {
    return (
      <Screen tone="dark">
        <LoadingState title="Feed" subtitle="Loading recommendations, wardrobe signals, and campaign context." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark">
        <ErrorState title="Feed" message="The feed could not load its recommendation and profile context." actionLabel="Profile" onRetry={() => router.push("/account")} />
      </Screen>
    );
  }

  if (!featured) {
    return (
      <Screen tone="dark">
        <EmptyState title="No recommendations yet" message="Complete your profile and fit data to unlock the personalized feed." actionLabel="Measurements" onAction={() => router.push("/measurements")} />
      </Screen>
    );
  }

  return (
    <Screen tone="dark">
      <SectionCard
        tone="dark"
        eyebrow="fitcheck.ai"
        title="Today's style"
        subtitle="A refined home feed with menu access, quick actions, recommendation logic, and direct entry into try-on and shopping."
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => setDrawerOpen((current) => !current)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="menu" size={18} color={colors.inkOnDark} />
          </Pressable>
          <View style={styles.titleCenter}>
            <Text style={styles.centerEyebrow}>fitcheck.ai</Text>
            <Text style={styles.centerTitle}>Today's style</Text>
            <Text style={styles.centerSub}>Fit-first picks for your profile.</Text>
          </View>
          <Pressable onPress={() => setProfileMenuOpen((current) => !current)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="user" size={18} color={colors.inkOnDark} />
          </Pressable>
        </View>

        {drawerOpen ? (
          <View style={styles.drawer}>
            {[
              { label: "Measurements", icon: "sliders", route: "/measurements" },
              { label: "Style Preferences", icon: "star", route: "/account" },
              { label: "Try-On History", icon: "clock", route: "/tryon-result" },
              { label: "Rewards", icon: "gift", route: "/rewards" },
              ...(adminVisible ? [{ label: "Admin / Partner Tools", icon: "settings", route: "/rewards" }] : []),
              { label: "Help & Safety", icon: "help-circle", route: "/account" }
            ].map((entry) => (
              <Pressable
                key={entry.label}
                onPress={() => {
                  setDrawerOpen(false);
                  router.push(entry.route as never);
                }}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              >
                <View style={styles.menuIcon}>
                  <Feather name={entry.icon as keyof typeof Feather.glyphMap} size={16} color={colors.accent} />
                </View>
                <Text style={styles.menuText}>{entry.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {profileMenuOpen ? (
          <View style={styles.profileMenu}>
            {[
              { label: "Change photo", route: "/account" },
              { label: "Preferences", route: "/account" },
              { label: "Measurements", route: "/measurements" },
              { label: "Logout lives in top strip", route: "/account" }
            ].map((entry) => (
              <Pressable
                key={entry.label}
                onPress={() => {
                  setProfileMenuOpen(false);
                  router.push(entry.route as never);
                }}
                style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
              >
                <Text style={styles.profileMenuText}>{entry.label}</Text>
                <Feather name="chevron-right" size={15} color={colors.inkSoft} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your AI Style DNA</Text>
          <Text style={styles.heroText}>
            {campaign?.description ??
              "Campus-smart, budget-aware, fit-first recommendations tuned to your measurements and saved looks."}
          </Text>
          <View style={styles.heroChips}>
            <Pill label={likedStyle} tone="accent" />
            <Pill label={data?.wallet ? `${data.wallet.balancePoints} pts` : "Rewards active"} tone="success" />
          </View>
        </View>

        <View style={styles.quickGrid}>
          {[
            { title: "Try outfit", subtitle: "Camera or gallery", icon: "camera", route: "/try-on" },
            { title: "Shop picks", subtitle: "Ranked by fit", icon: "shopping-bag", route: "/retail" },
            { title: "Change vibe", subtitle: "Style profile", icon: "feather", route: "/account" },
            { title: "Update size", subtitle: "Better accuracy", icon: "sliders", route: "/measurements" }
          ].map((entry) => (
            <Pressable key={entry.title} onPress={() => router.push(entry.route as never)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
              <View style={styles.quickIcon}>
                <Feather name={entry.icon as keyof typeof Feather.glyphMap} size={17} color={colors.accent} />
              </View>
              <Text style={styles.quickTitle}>{entry.title}</Text>
              <Text style={styles.quickSubtitle}>{entry.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.recommendationPanel}>
          <Text style={styles.panelTitle}>AI recommendation</Text>
          <Text style={styles.panelBody}>
            {featured.explanation ??
              `${featured.product?.name ?? "Current recommendation"} is a strong fit for your saved profile and current styling signals.`}
          </Text>
          <View style={styles.heroChips}>
            <Pill label={`Fit ${Math.round((featured.fitResult?.confidenceScore ?? 0.82) * 100)}%`} tone="success" />
            {(featured.reasonTags ?? []).slice(0, 2).map((tag) => (
              <Pill key={tag} label={tag} tone="accent" />
            ))}
            <Pill label={formatPrice(featured.offerSummary?.lowestPrice)} tone="warning" />
          </View>
          <View style={styles.inlineActions}>
            <PrimaryButton onPress={() => router.push("/try-on")} fullWidth={false}>
              Try this
            </PrimaryButton>
            <PrimaryButton onPress={() => router.push("/retail")} variant="secondary" fullWidth={false}>
              Shop now
            </PrimaryButton>
          </View>
        </View>

        <View style={styles.checklistPanel}>
          <Text style={styles.panelTitle}>Today's checklist</Text>
          {tasks.map((task) => (
            <View key={task.id} style={styles.checkItem}>
              <Pill label={task.title} tone={task.tone} />
              <Text style={styles.checkBody}>{task.detail}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => setQuickMenuOpen((current) => !current)} style={({ pressed }) => [styles.floatButton, pressed && styles.pressed]}>
          <Feather name="plus" size={22} color={colors.inkOnDark} />
        </Pressable>
        {quickMenuOpen ? (
          <View style={styles.quickMenu}>
            {[
              { label: "Start try-on", route: "/try-on" },
              { label: "Upload garment", route: "/try-on" },
              { label: "Scan product", route: "/try-on" },
              { label: "Save look", route: "/saved" }
            ].map((entry) => (
              <Pressable
                key={entry.label}
                onPress={() => {
                  setQuickMenuOpen(false);
                  router.push(entry.route as never);
                }}
                style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
              >
                <Text style={styles.profileMenuText}>{entry.label}</Text>
                <Feather name="star" size={15} color={colors.accent} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        tone="dark"
        eyebrow="For You"
        title="Swipe looks"
        subtitle="The feed card mirrors the reels-style discovery surface from the HTML reference and keeps try-on one tap away."
      >
        <View style={styles.feedCard}>
          <View style={styles.feedGlow} />
          <View style={styles.feedCopy}>
            <View style={styles.heroChips}>
              <Pill label={(featured.product?.styleTags ?? [])[0] ?? "Trending"} tone="accent" />
              <Pill label={formatPrice(featured.offerSummary?.lowestPrice)} tone="warning" />
            </View>
            <Text style={styles.feedTitle}>{featured.product?.name ?? "Mesh-layer street look"}</Text>
            <Text style={styles.feedBody}>
              {featured.product?.description ??
                "Trend-led outfit discovery that drops directly into try-on and shopping without changing context."}
            </Text>
          </View>
          <View style={styles.feedActions}>
            <Pressable onPress={() => router.push("/saved")} style={({ pressed }) => [styles.feedFab, pressed && styles.pressed]}>
              <Feather name="heart" size={16} color={colors.inkOnDark} />
            </Pressable>
            <Pressable onPress={() => router.push("/retail")} style={({ pressed }) => [styles.feedFab, pressed && styles.pressed]}>
              <Feather name="share-2" size={16} color={colors.inkOnDark} />
            </Pressable>
            <Pressable onPress={() => router.push("/try-on")} style={({ pressed }) => [styles.feedFab, styles.feedFabAccent, pressed && styles.pressed]}>
              <Feather name="star" size={16} color={colors.inkOnDark} />
            </Pressable>
          </View>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  titleCenter: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  centerEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  centerTitle: {
    color: colors.inkOnDark,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800"
  },
  centerSub: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  drawer: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 8
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  menuText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "700"
  },
  profileMenu: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    gap: 6
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(248,250,252,0.96)"
  },
  profileMenuText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  heroCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.accent,
    gap: 8
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 17,
    fontWeight: "800"
  },
  heroText: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 19
  },
  heroChips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickCard: {
    width: "48%",
    minHeight: 96,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 8
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  quickTitle: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "700"
  },
  quickSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 11.5,
    lineHeight: 16
  },
  recommendationPanel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: colors.panelStrong,
    gap: 10
  },
  checklistPanel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.lineDark,
    gap: 10
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 14.5,
    fontWeight: "800"
  },
  panelBody: {
    color: colors.inkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  checkItem: {
    gap: 8
  },
  checkBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  floatButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  quickMenu: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    gap: 6,
    marginBottom: 54
  },
  feedCard: {
    minHeight: 430,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#271c43",
    padding: 14
  },
  feedGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  feedCopy: {
    position: "absolute",
    left: 14,
    right: 80,
    bottom: 18,
    gap: 8
  },
  feedTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800"
  },
  feedBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 12.5,
    lineHeight: 18
  },
  feedActions: {
    position: "absolute",
    right: 12,
    bottom: 18,
    gap: 10
  },
  feedFab: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  feedFabAccent: {
    backgroundColor: "rgba(109,94,252,0.5)"
  },
  pressed: {
    opacity: 0.9
  }
});
