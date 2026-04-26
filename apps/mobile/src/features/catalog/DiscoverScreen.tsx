import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { Recommendation } from "../../types/api";
import { Screen } from "../../components/Screen";

function formatPrice(value?: number | null) {
  return value != null ? `Rs. ${Math.round(value)}` : "Price pending";
}

function formatStyleLabel(preferredStyles: unknown) {
  const styles = Array.isArray(preferredStyles) ? preferredStyles.filter((item): item is string => typeof item === "string") : [];
  return styles.slice(0, 2).join(" • ") || "Streetwear • Smart";
}

function readinessItems(input: { avatarReady: boolean; measurementReady: boolean; savedLooksCount: number }) {
  return [
    {
      id: "avatar",
      title: input.avatarReady ? "Profile image ready" : "Profile photo missing",
      detail: input.avatarReady
        ? "Your saved image can power try-on and profile surfaces."
        : "Upload a clean portrait so try-on starts without manual selection.",
      tone: input.avatarReady ? colors.successSoft : colors.warningSoft,
      iconColor: input.avatarReady ? colors.success : colors.warning
    },
    {
      id: "measurements",
      title: input.measurementReady ? "Measurements synced" : "Measurements need refresh",
      detail: input.measurementReady
        ? "Fit confidence has enough data for size and issue ranking."
        : "Add chest, waist, hips, shoulder, and inseam to improve fit guidance.",
      tone: input.measurementReady ? colors.successSoft : colors.warningSoft,
      iconColor: input.measurementReady ? colors.success : colors.warning
    },
    {
      id: "saved",
      title: input.savedLooksCount > 0 ? "Wardrobe memory active" : "No saved looks yet",
      detail:
        input.savedLooksCount > 0
          ? "Saved looks are already shaping your recommendation stack."
          : "Save one look or wishlist item to strengthen the feed.",
      tone: input.savedLooksCount > 0 ? colors.accentSoft : colors.infoSoft,
      iconColor: input.savedLooksCount > 0 ? colors.accent : colors.info
    }
  ] as const;
}

function closeMenus(setDrawerOpen: (value: boolean) => void, setProfileMenuOpen: (value: boolean) => void, setQuickMenuOpen: (value: boolean) => void) {
  setDrawerOpen(false);
  setProfileMenuOpen(false);
  setQuickMenuOpen(false);
}

export function DiscoverScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const userRole = useAppStore((state) => state.userRole);
  const profile = useAppStore((state) => state.profile);
  const logout = useAppStore((state) => state.logout);

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

      return { recommendations, wallet, campaigns };
    },
    [userId]
  );

  const featured = data?.recommendations?.[0] ?? null;
  const wallet = data?.wallet ?? null;
  const campaign = data?.campaigns?.[0] ?? null;
  const adminVisible = userRole === "ADMIN" || userRole === "OPERATOR";
  const styleLabel = useMemo(
    () => formatStyleLabel(profile?.stylePreference?.preferredStyles),
    [profile?.stylePreference]
  );
  const readiness = readinessItems({
    avatarReady: Boolean(profile?.avatarUrl),
    measurementReady: Boolean(profile?.measurements?.[0]),
    savedLooksCount: profile?.savedLooks?.length ?? 0
  });

  const navigate = (route: string) => {
    closeMenus(setDrawerOpen, setProfileMenuOpen, setQuickMenuOpen);
    router.push(route as never);
  };

  const toggleDrawer = () => {
    setDrawerOpen((current) => {
      const next = !current;
      if (next) {
        setProfileMenuOpen(false);
        setQuickMenuOpen(false);
      }
      return next;
    });
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen((current) => {
      const next = !current;
      if (next) {
        setDrawerOpen(false);
        setQuickMenuOpen(false);
      }
      return next;
    });
  };

  const toggleQuickMenu = () => {
    setQuickMenuOpen((current) => {
      const next = !current;
      if (next) {
        setDrawerOpen(false);
        setProfileMenuOpen(false);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    closeMenus(setDrawerOpen, setProfileMenuOpen, setQuickMenuOpen);
    await logout();
    (router as { dismissAll?: () => void }).dismissAll?.();
    router.replace("/onboarding");
  };

  if (loading) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <LoadingState title="Feed" subtitle="Loading recommendations, reward context, and profile signals." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <ErrorState
          title="Feed unavailable"
          message="The home feed could not load its recommendation and profile context."
          actionLabel="Profile"
          onRetry={() => router.push("/account")}
        />
      </Screen>
    );
  }

  if (!featured) {
    return (
      <Screen tone="dark" showProfileStrip={false}>
        <EmptyState
          title="No recommendations yet"
          message="Complete your profile and fit data to unlock the personalized feed."
          actionLabel="Measurements"
          onAction={() => router.push("/measurements")}
        />
      </Screen>
    );
  }

  const drawerItems = [
    { label: "Measurements", icon: "sliders", route: "/measurements" },
    { label: "Style Preferences", icon: "star", route: "/account" },
    { label: "Try-On History", icon: "clock", route: "/tryon-result" },
    { label: "Rewards", icon: "gift", route: "/rewards" },
    ...(adminVisible ? [{ label: "Admin Tools", icon: "shield", route: "/account" }] : [])
  ];

  const profileMenuItems = [
    { label: "Change photo", icon: "image", route: "/account" },
    { label: "Preferences", icon: "sliders", route: "/account" },
    { label: "Theme", icon: "droplet", route: "/account" }
  ];

  const quickActionItems = [
    { label: "Try outfit", icon: "star", route: "/try-on" },
    { label: "Upload photo", icon: "upload", route: "/tryon-upload" },
    { label: "Scan product", icon: "search", route: "/retail" },
    { label: "Save look", icon: "heart", route: "/saved" }
  ];

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.appBar}>
          <Pressable onPress={toggleDrawer} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="menu" size={18} color={colors.inkOnDark} />
          </Pressable>
          <View style={styles.appBarCenter}>
            <Text style={styles.appBarEyebrow}>fitme.ai</Text>
            <Text style={styles.appBarTitle}>Today's style</Text>
            <Text style={styles.appBarSubtitle}>Fit-first picks for your profile.</Text>
          </View>
          <Pressable onPress={toggleProfileMenu} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Feather name="user" size={18} color={colors.inkOnDark} />
          </Pressable>
        </View>

        {drawerOpen ? (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Menu</Text>
            {drawerItems.map((item) => (
              <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.overlayRow, pressed && styles.pressed]}>
                <View style={styles.overlayIconWrap}>
                  <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={colors.accent} />
                </View>
                <Text style={styles.overlayLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {profileMenuOpen ? (
          <View style={styles.profileMenu}>
            {profileMenuItems.map((item) => (
              <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.menuActionRow, pressed && styles.pressed]}>
                <View style={styles.menuActionCopy}>
                  <Text style={styles.menuActionLabel}>{item.label}</Text>
                </View>
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={15} color={colors.inkSoft} />
              </Pressable>
            ))}
            <Pressable onPress={() => void handleLogout()} style={({ pressed }) => [styles.menuActionRow, pressed && styles.pressed]}>
              <View style={styles.menuActionCopy}>
                <Text style={[styles.menuActionLabel, styles.logoutLabel]}>Logout</Text>
              </View>
              <Feather name="log-out" size={15} color={colors.danger} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          {featured.product?.imageUrl ? <Image source={{ uri: featured.product.imageUrl }} style={styles.heroImage} /> : null}
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your AI Style DNA</Text>
            <Text style={styles.heroBody}>
              {campaign?.description ??
                "Campus-smart, budget-aware, fit-first recommendations tuned to your measurements and saved looks."}
            </Text>
            <View style={styles.chipRow}>
              <InfoChip label={styleLabel} tone="dark" />
              <InfoChip
                label={wallet ? `${wallet.balancePoints} pts` : "Rewards active"}
                tone="success"
              />
              {campaign ? <InfoChip label={campaign.title} tone="accent" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          {quickActionItems.map((item) => (
            <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
              <View style={styles.quickIcon}>
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={17} color={colors.accent} />
              </View>
              <Text style={styles.quickTitle}>{item.label}</Text>
              <Text style={styles.quickSubtitle}>
                {item.label === "Try outfit"
                  ? "Camera or gallery"
                  : item.label === "Upload photo"
                    ? "Prepare try-on input"
                    : item.label === "Scan product"
                      ? "Jump into shopping"
                      : "Add to wardrobe memory"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>AI Recommendation</Text>
              <Text style={styles.panelTitle}>Top pick for your profile</Text>
            </View>
            {wallet ? <InfoChip label={`Tier ${wallet.tierLabel}`} tone="success" /> : null}
          </View>

          <View style={styles.recommendationCard}>
            {featured.product?.imageUrl ? <Image source={{ uri: featured.product.imageUrl }} style={styles.recommendationImage} /> : null}
            <View style={styles.recommendationCopy}>
              <Text style={styles.recommendationTitle}>{featured.product?.name ?? "Top recommendation"}</Text>
              <Text style={styles.recommendationBody}>
                {featured.explanation ??
                  `${featured.product?.name ?? "This look"} is a strong fit for your saved profile and styling signals.`}
              </Text>
              <View style={styles.chipRow}>
                <InfoChip label={`Fit ${featured.fitResult?.fitScore ?? 91}%`} tone="success" />
                <InfoChip label={formatPrice(featured.offerSummary?.lowestPrice)} tone="warning" />
                {(featured.reasonTags ?? []).slice(0, 2).map((tag) => (
                  <InfoChip key={tag} label={tag} tone="accent" />
                ))}
              </View>
              <View style={styles.buttonRow}>
                <ActionButton label="Try this" onPress={() => navigate("/try-on")} />
                <ActionButton label="Shop now" onPress={() => navigate("/retail")} variant="secondary" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Profile readiness</Text>
          <Text style={styles.panelTitle}>Today&apos;s checklist</Text>
          <View style={styles.checklist}>
            {readiness.map((item) => (
              <View key={item.id} style={styles.checkCard}>
                <View style={[styles.checkIcon, { backgroundColor: item.tone }]}>
                  <Feather name="check" size={14} color={item.iconColor} />
                </View>
                <View style={styles.checkCopy}>
                  <Text style={styles.checkTitle}>{item.title}</Text>
                  <Text style={styles.checkDetail}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>For you</Text>
          <Text style={styles.panelTitle}>Feed-first discovery</Text>
          <View style={styles.feedCard}>
            {featured.product?.imageUrl ? <Image source={{ uri: featured.product.imageUrl }} style={styles.feedImage} /> : null}
            <View style={styles.feedShade} />
            <View style={styles.feedCopy}>
              <View style={styles.chipRow}>
                <InfoChip label={(featured.product?.styleTags ?? [])[0] ?? "Trending"} tone="dark" />
                <InfoChip label={formatPrice(featured.offerSummary?.lowestPrice)} tone="dark" />
              </View>
              <Text style={styles.feedTitle}>{featured.product?.name ?? "Mesh-layer street look"}</Text>
              <Text style={styles.feedBody}>
                {featured.product?.description ??
                  "Trend-led outfit discovery that drops directly into try-on and shopping without changing context."}
              </Text>
            </View>
            <View style={styles.feedActions}>
              <Pressable onPress={() => navigate("/saved")} style={({ pressed }) => [styles.feedFab, pressed && styles.pressed]}>
                <Feather name="heart" size={16} color={colors.inkOnDark} />
              </Pressable>
              <Pressable onPress={() => navigate("/retail")} style={({ pressed }) => [styles.feedFab, pressed && styles.pressed]}>
                <Feather name="share-2" size={16} color={colors.inkOnDark} />
              </Pressable>
              <Pressable onPress={() => navigate("/try-on")} style={({ pressed }) => [styles.feedFab, styles.feedFabAccent, pressed && styles.pressed]}>
                <Feather name="star" size={16} color={colors.inkOnDark} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable onPress={toggleQuickMenu} style={({ pressed }) => [styles.floatButton, pressed && styles.pressed]}>
          <Feather name="plus" size={24} color={colors.inkOnDark} />
        </Pressable>
        {quickMenuOpen ? (
          <View style={styles.quickMenu}>
            {quickActionItems.map((item) => (
              <Pressable key={item.label} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.menuActionRow, pressed && styles.pressed]}>
                <View style={styles.menuActionCopy}>
                  <Text style={styles.menuActionLabel}>{item.label}</Text>
                </View>
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={15} color={colors.accent} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function InfoChip({
  label,
  tone
}: {
  label: string;
  tone: "accent" | "success" | "warning" | "dark";
}) {
  return (
    <View
      style={[
        styles.infoChip,
        tone === "accent" && styles.infoChipAccent,
        tone === "success" && styles.infoChipSuccess,
        tone === "warning" && styles.infoChipWarning,
        tone === "dark" && styles.infoChipDark
      ]}
    >
      <Text
        style={[
          styles.infoChipText,
          tone === "dark" && styles.infoChipTextDark,
          tone === "warning" && styles.infoChipTextWarning
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary" ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.actionButtonText, variant === "secondary" && styles.actionButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  appBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.lineDark,
    alignItems: "center",
    justifyContent: "center"
  },
  appBarCenter: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingTop: 2
  },
  appBarEyebrow: {
    color: colors.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  appBarTitle: {
    color: colors.inkOnDark,
    fontSize: 24,
    fontWeight: "800"
  },
  appBarSubtitle: {
    color: colors.inkOnDarkSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  },
  overlayCard: {
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  overlayTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  overlayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  overlayIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  overlayLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  profileMenu: {
    alignSelf: "flex-end",
    width: "72%",
    minWidth: 220,
    borderRadius: radius.lg,
    padding: 10,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  menuActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.md
  },
  menuActionCopy: {
    flex: 1
  },
  menuActionLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  logoutLabel: {
    color: colors.danger
  },
  heroCard: {
    minHeight: 228,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.heroEnd,
    ...shadow
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,22,37,0.42)"
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 10,
    padding: 18,
    backgroundColor: "rgba(16,22,37,0.22)"
  },
  heroTitle: {
    color: colors.inkOnDark,
    fontSize: 24,
    fontWeight: "800"
  },
  heroBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  infoChipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  infoChipSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft
  },
  infoChipWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningSoft
  },
  infoChipDark: {
    backgroundColor: "rgba(17,24,40,0.72)",
    borderColor: "rgba(255,255,255,0.08)"
  },
  infoChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  infoChipTextDark: {
    color: colors.inkOnDark
  },
  infoChipTextWarning: {
    color: colors.warning
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickCard: {
    width: "47.8%",
    minHeight: 118,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.line
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  quickTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  quickSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  panel: {
    borderRadius: radius.xl,
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  panelEyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 2
  },
  recommendationCard: {
    gap: 14
  },
  recommendationImage: {
    width: "100%",
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.pageStrong
  },
  recommendationCopy: {
    gap: 10
  },
  recommendationTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  recommendationBody: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 22
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  actionButtonSecondary: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.lineStrong
  },
  actionButtonText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  actionButtonTextSecondary: {
    color: colors.ink
  },
  checklist: {
    gap: 10
  },
  checkCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  checkIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  checkCopy: {
    flex: 1,
    gap: 4
  },
  checkTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  checkDetail: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  feedCard: {
    minHeight: 430,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.heroEnd
  },
  feedImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  feedShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,15,28,0.42)"
  },
  feedCopy: {
    position: "absolute",
    left: 16,
    right: 80,
    bottom: 18,
    gap: 10
  },
  feedTitle: {
    color: colors.inkOnDark,
    fontSize: 18,
    fontWeight: "800"
  },
  feedBody: {
    color: colors.inkOnDarkSoft,
    fontSize: 13,
    lineHeight: 20
  },
  feedActions: {
    position: "absolute",
    right: 14,
    bottom: 18,
    gap: 10
  },
  feedFab: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  feedFabAccent: {
    backgroundColor: colors.accent
  },
  floatButton: {
    position: "absolute",
    right: 0,
    bottom: 8,
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentStrong,
    ...shadow
  },
  quickMenu: {
    position: "absolute",
    right: 0,
    bottom: 76,
    width: 220,
    borderRadius: radius.lg,
    padding: 10,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  }
});
