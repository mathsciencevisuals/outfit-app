import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { UserProfile } from "../../types/api";
import { Screen } from "../../components/Screen";

type AvatarDraft = {
  uploadId: string;
  publicUrl: string;
  localUri: string;
} | null;

function parsePreferredStyles(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function buildProfilePayload(profile: UserProfile, budgetLabel: string) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatarUploadId: profile.avatarUploadId ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    gender: profile.gender ?? null,
    age: profile.age ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    bodyShape: profile.bodyShape ?? null,
    fitPreference: profile.fitPreference ?? "regular",
    budgetMin: profile.budgetMin ?? null,
    budgetMax: profile.budgetMax ?? null,
    budgetLabel: budgetLabel || profile.budgetLabel || null,
    closetStatus: profile.closetStatus ?? "COMING_SOON",
    stylePreference: profile.stylePreference ?? null,
    preferredColors: profile.preferredColors ?? [],
    avoidedColors: profile.avoidedColors ?? []
  };
}

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const userEmail = useAppStore((state) => state.userEmail);
  const userRole = useAppStore((state) => state.userRole);
  const profile = useAppStore((state) => state.profile);
  const logout = useAppStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>(null);
  const [budgetLabel, setBudgetLabel] = useState("");

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const next = await mobileApi.refreshProfile(userId);
      setBudgetLabel(next.budgetLabel ?? "");
      setError(null);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (profile) {
      setBudgetLabel(profile.budgetLabel ?? "");
    }
  }, [profile]);

  const latestMeasurement = profile?.measurements?.[0] ?? null;
  const savedLooks = profile?.savedLooks ?? [];
  const avatarSource = avatarDraft?.localUri ?? avatarDraft?.publicUrl ?? profile?.avatarUrl ?? null;
  const styleTags = parsePreferredStyles(profile?.stylePreference?.preferredStyles);
  const displayName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "fitme.ai user";
  const roleVisible = userRole === "ADMIN" || userRole === "OPERATOR";
  const measurementSummary = latestMeasurement
    ? `${latestMeasurement.chestCm ?? "--"} chest · ${latestMeasurement.waistCm ?? "--"} waist · ${latestMeasurement.hipsCm ?? "--"} hips`
    : "No measurements saved yet";
  const budgetSummary =
    budgetLabel || profile?.budgetLabel || (profile?.budgetMin != null && profile?.budgetMax != null
      ? `Rs. ${profile.budgetMin} - Rs. ${profile.budgetMax}`
      : "Budget preference pending");

  const lookImage = (index: number) =>
    savedLooks[index]?.items?.[0]?.product?.imageUrl ??
    savedLooks[index]?.recommendedProducts?.[0]?.imageUrl ??
    null;

  const pickAvatar = async () => {
    if (!profile || !userId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library permission is required to upload a profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const upload = await mobileApi.uploadProfileImage(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType
      });

      setAvatarDraft({
        uploadId: upload.id,
        publicUrl: upload.publicUrl,
        localUri: asset.uri
      });

      await mobileApi.updateProfile(userId, {
        ...buildProfilePayload(profile, budgetLabel),
        avatarUploadId: upload.id,
        avatarUrl: upload.publicUrl
      });

      setAvatarDraft(null);
      setMessage("Profile photo uploaded.");
    } catch (nextError: unknown) {
      setAvatarDraft(null);
      setMessage(nextError instanceof Error ? nextError.message : "Could not upload profile image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveBudgetLabel = async () => {
    if (!profile) {
      return;
    }

    setMessage(null);
    try {
      await mobileApi.updateProfile(userId, buildProfilePayload(profile, budgetLabel));
      setMessage("Profile preferences updated.");
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not update profile.");
    }
  };

  const handleLogout = async () => {
    await logout();
    (router as { dismissAll?: () => void }).dismissAll?.();
    router.replace("/onboarding");
  };

  if (loading && !profile) {
    return (
      <Screen showProfileStrip={false}>
        <LoadingState title="Profile" subtitle="Loading your wardrobe and account controls." />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen showProfileStrip={false}>
        <ErrorState title="Profile" message="The profile hub could not be loaded." actionLabel="Retry" onRetry={() => void refreshProfile()} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen showProfileStrip={false}>
        <EmptyState
          title="Profile missing"
          message="There is no profile data loaded for this account yet."
          actionLabel="Onboarding"
          onAction={() => router.push("/onboarding")}
        />
      </Screen>
    );
  }

  return (
    <Screen showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.eyebrow}>Profile</Text>
            <Pressable onPress={() => void handleLogout()} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.identityRow}>
            <Pressable onPress={pickAvatar} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
              {avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatarImage} /> : <Text style={styles.avatarFallback}>AI</Text>}
            </Pressable>

            <View style={styles.identityCopy}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.mail}>{userEmail || "demo@fitme.dev"}</Text>
              <View style={styles.chipRow}>
                <InfoChip label={`${savedLooks.length} saved fits`} tone="success" />
                {styleTags.slice(0, 2).map((tag) => (
                  <InfoChip key={tag} label={tag} />
                ))}
                {roleVisible ? <InfoChip label={userRole ?? "ADMIN"} tone="accent" /> : null}
                {uploadingAvatar ? <InfoChip label="Uploading..." tone="accent" /> : null}
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <ActionLink label="Change photo" icon="image" onPress={pickAvatar} />
            <ActionLink label="Saved wardrobe" icon="heart" onPress={() => router.push("/saved")} />
            <ActionLink label="Try-On history" icon="clock" onPress={() => router.push("/tryon-result")} />
            <ActionLink label="Preferences" icon="sliders" onPress={() => router.push("/account")} />
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <InfoCard
            title="Measurements summary"
            body={measurementSummary}
            actionLabel="Edit measurements"
            onAction={() => router.push("/measurements")}
          />
          <InfoCard
            title="Style preferences"
            body={styleTags.length > 0 ? styleTags.join(" • ") : "Streetwear, minimal, and smart tags are not set yet."}
            actionLabel="Preferences"
            onAction={() => router.push("/account")}
          />
          <InfoCard
            title="Budget preference"
            body={budgetSummary}
            actionLabel="Save budget"
            onAction={() => void saveBudgetLabel()}
          >
            <TextInput
              style={styles.input}
              value={budgetLabel}
              onChangeText={setBudgetLabel}
              placeholder="Budget label"
              placeholderTextColor={colors.inkMuted}
            />
          </InfoCard>
          <InfoCard
            title="Theme preference"
            body="Theme switching can live here once account-level appearance preferences are persisted."
            actionLabel="Coming soon"
          />
          {roleVisible ? (
            <InfoCard
              title="Admin tools"
              body="Provider controls, moderation, and partner operations should stay visible here for privileged roles."
              actionLabel="Open tools"
              onAction={() => router.push("/account")}
              tone="accent"
            />
          ) : null}
        </View>

        <View style={styles.wardrobeCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Wardrobe preview</Text>
              <Text style={styles.sectionBody}>Saved looks, liked fits, and wardrobe memory all live here.</Text>
            </View>
            <Pressable onPress={() => router.push("/saved")} style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}>
              <Text style={styles.inlineActionText}>Open wardrobe</Text>
            </Pressable>
          </View>

          <View style={styles.wardrobeGrid}>
            {savedLooks.slice(0, 4).map((look, index) => (
              <View key={look.id} style={styles.wardCard}>
                <View style={[styles.thumb, index % 2 === 1 && styles.thumbAlt]}>
                  {lookImage(index) ? <Image source={{ uri: lookImage(index)! }} style={styles.thumbImage} /> : null}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.metaTitle}>{look.name}</Text>
                  <Text style={styles.metaText}>
                    {look.note ?? (look.isWishlist ? "Liked garment" : "Saved just now")}
                  </Text>
                </View>
              </View>
            ))}
            {savedLooks.length === 0 ? (
              <View style={styles.emptyWardrobe}>
                <Text style={styles.emptyWardrobeTitle}>No saved looks yet</Text>
                <Text style={styles.emptyWardrobeBody}>Generate a try-on or save a recommendation to populate your wardrobe preview.</Text>
              </View>
            ) : null}
          </View>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </Screen>
  );
}

function InfoCard({
  title,
  body,
  actionLabel,
  onAction,
  tone = "default",
  children
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "accent";
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.infoCard, tone === "accent" && styles.infoCardAccent]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      {children}
      {actionLabel ? (
        <Pressable onPress={onAction} disabled={!onAction} style={({ pressed }) => [styles.cardAction, pressed && onAction && styles.pressed]}>
          <Text style={[styles.cardActionText, !onAction && styles.cardActionTextMuted]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InfoChip({
  label,
  tone = "default"
}: {
  label: string;
  tone?: "default" | "success" | "accent";
}) {
  return (
    <View style={[styles.chip, tone === "success" && styles.chipSuccess, tone === "accent" && styles.chipAccent]}>
      <Text style={[styles.chipText, tone === "success" && styles.chipTextSuccess, tone === "accent" && styles.chipTextAccent]}>{label}</Text>
    </View>
  );
}

function ActionLink({
  label,
  icon,
  onPress
}: {
  label: string;
  icon: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable onPress={() => void onPress()} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}>
      <Text style={styles.actionIcon}>{icon === "image" ? "◌" : icon === "heart" ? "♡" : icon === "clock" ? "◷" : "☰"}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  headerCard: {
    gap: 16,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(213,91,103,0.16)"
  },
  logoutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800"
  },
  identityRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcdffd"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "900"
  },
  identityCopy: {
    flex: 1,
    gap: 5
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  mail: {
    color: colors.inkSoft,
    fontSize: 13
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  chipSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft
  },
  chipAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft
  },
  chipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  chipTextSuccess: {
    color: colors.success
  },
  chipTextAccent: {
    color: colors.accentStrong
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionLink: {
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  actionIcon: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800"
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  summaryGrid: {
    gap: 12
  },
  infoCard: {
    gap: 10,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  infoCardAccent: {
    backgroundColor: colors.accentSoft
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  cardBody: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  cardAction: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  cardActionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  cardActionTextMuted: {
    color: colors.inkMuted
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panelMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink
  },
  wardrobeCard: {
    gap: 14,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  sectionBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 260
  },
  inlineAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  inlineActionText: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800"
  },
  wardrobeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  wardCard: {
    width: "47.8%",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  thumb: {
    height: 116,
    backgroundColor: "#eadfd6"
  },
  thumbAlt: {
    backgroundColor: "#d9e2ff"
  },
  thumbImage: {
    width: "100%",
    height: "100%"
  },
  meta: {
    padding: 10,
    gap: 3
  },
  metaTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  metaText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17
  },
  emptyWardrobe: {
    width: "100%",
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  emptyWardrobeTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  emptyWardrobeBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  message: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
