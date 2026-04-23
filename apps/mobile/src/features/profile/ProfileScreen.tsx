import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { MetricTile } from "../../components/MetricTile";
import { NavigationCard } from "../../components/NavigationCard";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, fonts, radius } from "../../theme/design";
import type { UserProfile } from "../../types/api";

const suggestedStyles = ["minimal", "smart", "sport", "streetwear", "tailored", "casual"];
const suggestedColors = ["black", "white", "olive", "navy", "cream", "camel", "gray"];

type AvatarDraft = {
  uploadId: string;
  publicUrl: string;
  localUri: string;
} | null;

function parseStyleList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function formatBudgetSummary(budgetLabel: string, budgetMin: string, budgetMax: string) {
  if (budgetLabel) {
    return budgetLabel;
  }
  if (budgetMin && budgetMax) {
    return `$${budgetMin}-${budgetMax}`;
  }
  if (budgetMax) {
    return `Up to $${budgetMax}`;
  }
  if (budgetMin) {
    return `From $${budgetMin}`;
  }
  return "Not set";
}

function buildProfilePayload(
  profile: UserProfile,
  input: {
    firstName?: string;
    lastName?: string;
    bodyShape?: string;
    gender?: string;
    budgetLabel?: string;
    budgetMin?: string;
    budgetMax?: string;
    preferredStyles?: string[];
    preferredColors?: string[];
    avoidedColors?: string[];
    avatarUploadId?: string | null;
    avatarUrl?: string | null;
  }
) {
  return {
    firstName: input.firstName?.trim() || profile.firstName,
    lastName: input.lastName?.trim() || profile.lastName,
    avatarUploadId: input.avatarUploadId === undefined ? profile.avatarUploadId ?? null : input.avatarUploadId,
    avatarUrl: input.avatarUrl === undefined ? profile.avatarUrl ?? null : input.avatarUrl,
    gender: input.gender?.trim() || profile.gender || null,
    age: profile.age ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    bodyShape: input.bodyShape?.trim() || profile.bodyShape || null,
    fitPreference: profile.fitPreference ?? "regular",
    budgetMin: input.budgetMin ? Number(input.budgetMin) : profile.budgetMin ?? null,
    budgetMax: input.budgetMax ? Number(input.budgetMax) : profile.budgetMax ?? null,
    budgetLabel: input.budgetLabel?.trim() || profile.budgetLabel || null,
    closetStatus: profile.closetStatus ?? "COMING_SOON",
    stylePreference: {
      ...(profile.stylePreference ?? {}),
      preferredStyles: input.preferredStyles ?? parseStyleList(profile.stylePreference?.preferredStyles)
    },
    preferredColors: input.preferredColors ?? profile.preferredColors ?? [],
    avoidedColors: input.avoidedColors ?? profile.avoidedColors ?? []
  };
}

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const userEmail = useAppStore((state) => state.userEmail);
  const profile = useAppStore((state) => state.profile);
  const profileVersion = useAppStore((state) => state.profileVersion);
  const logout = useAppStore((state) => state.logout);
  const lastTryOnRequestId = useAppStore((state) => state.lastTryOnRequestId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bodyShape, setBodyShape] = useState("");
  const [gender, setGender] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [avoidedColors, setAvoidedColors] = useState<string[]>([]);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      await mobileApi.refreshProfile(userId);
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
    if (!profile) {
      return;
    }

    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setBodyShape(profile.bodyShape ?? "");
    setGender(profile.gender ?? "");
    setBudgetLabel(profile.budgetLabel ?? "");
    setBudgetMin(profile.budgetMin != null ? `${profile.budgetMin}` : "");
    setBudgetMax(profile.budgetMax != null ? `${profile.budgetMax}` : "");
    setPreferredColors(profile.preferredColors ?? []);
    setAvoidedColors(profile.avoidedColors ?? []);
    setPreferredStyles(parseStyleList(profile.stylePreference?.preferredStyles));
    setAvatarDraft((current) => {
      if (!current) {
        return null;
      }

      if (profile.avatarUploadId === current.uploadId || profile.avatarUrl === current.publicUrl) {
        return null;
      }

      return current;
    });
  }, [profile, profileVersion]);

  const latestMeasurement = profile?.measurements?.[0] ?? null;
  const avatarSource = avatarDraft?.localUri ?? avatarDraft?.publicUrl ?? profile?.avatarUrl ?? null;
  const displayName = `${firstName || profile?.firstName || ""} ${lastName || profile?.lastName || ""}`.trim() || "FitMe Member";
  const savedLooksCount = profile?.savedLooks?.length ?? 0;
  const wishlistCount = profile?.savedLooks?.filter((look) => Boolean(look.isWishlist)).length ?? 0;
  const wardrobeItems = profile?.savedLooks?.slice(0, 4) ?? [];
  const budgetSummary = formatBudgetSummary(budgetLabel, budgetMin, budgetMax);
  const hasIdentity = Boolean(firstName.trim() || lastName.trim() || profile?.firstName || profile?.lastName);

  const completionScore = useMemo(
    () =>
      [
        avatarSource,
        profile?.heightCm,
        profile?.bodyShape,
        preferredColors.length > 0,
        preferredStyles.length > 0,
        budgetLabel || budgetMin || budgetMax
      ].filter(Boolean).length,
    [avatarSource, budgetLabel, budgetMax, budgetMin, preferredColors.length, preferredStyles.length, profile?.bodyShape, profile?.heightCm]
  );

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const saveProfile = async () => {
    if (!profile || !userId) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.updateProfile(
        userId,
        buildProfilePayload(profile, {
          firstName,
          lastName,
          bodyShape,
          gender,
          budgetLabel,
          budgetMin,
          budgetMax,
          preferredStyles,
          preferredColors,
          avoidedColors,
          avatarUploadId: avatarDraft?.uploadId ?? profile.avatarUploadId ?? null,
          avatarUrl: avatarDraft?.publicUrl ?? profile.avatarUrl ?? null
        })
      );
      setMessage(avatarDraft ? "Profile and photo saved" : "Profile updated");
      setAvatarDraft(null);
      setEditorOpen(false);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!profile || !userId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library permission is required to upload a profile image");
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
    setAvatarDraft({
      uploadId: profile.avatarUploadId ?? "",
      publicUrl: profile.avatarUrl ?? asset.uri,
      localUri: asset.uri
    });

    try {
      const upload = await mobileApi.uploadProfileImage(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType
      });

      await mobileApi.updateProfile(
        userId,
        buildProfilePayload(profile, {
          avatarUploadId: upload.id,
          avatarUrl: upload.publicUrl
        })
      );

      setAvatarDraft(null);
      setMessage("Profile photo uploaded");
    } catch (nextError: unknown) {
      setAvatarDraft(null);
      setMessage(nextError instanceof Error ? nextError.message : "Could not upload profile image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    (router as { dismissAll?: () => void }).dismissAll?.();
    router.replace("/onboarding");
  };

  if (loading && !profile) {
    return (
      <Screen>
        <LoadingState title="Profile" subtitle="Loading your profile hub." />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <ErrorState title="Profile" message="The profile hub could not be loaded." actionLabel="Retry" onRetry={() => void refreshProfile()} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState title="Profile missing" message="There is no profile data loaded for this account yet." actionLabel="Go to onboarding" onAction={() => router.push("/onboarding")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard eyebrow="Profile" title="Your wardrobe hub" subtitle="Avatar, logout, profile signals, and saved looks stay in one lighter premium surface.">
        <View style={styles.heroCard}>
          <View style={styles.heroBackdrop} />
          <View style={styles.profileHero}>
            <Pressable onPress={pickAvatar} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
              {avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatar} /> : <Feather name="camera" size={22} color={colors.ink} />}
            </Pressable>
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{userEmail || "Member account"}</Text>
              <View style={styles.badgeRow}>
                <Pill label={`${completionScore}/6 profile signals set`} tone={completionScore >= 4 ? "success" : "warning"} />
                <Pill label={profile.bodyShape ?? "Shape pending"} tone="neutral" />
                {uploadingAvatar ? <Pill label="Uploading photo..." tone="info" /> : null}
              </View>
            </View>
          </View>

          <View style={styles.profileActions}>
            <PrimaryButton onPress={pickAvatar} variant="secondary">
              Change photo
            </PrimaryButton>
            <PrimaryButton onPress={() => setEditorOpen((current) => !current)}>{editorOpen ? "Close editor" : "Edit profile"}</PrimaryButton>
            <PrimaryButton variant="ghost" onPress={handleLogout}>
              Logout
            </PrimaryButton>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={styles.metricGrid}>
          <MetricTile label="Measurements" value={latestMeasurement ? "Ready" : "Pending"} caption="Cross-screen fit sync" />
          <MetricTile label="Saved looks" value={`${savedLooksCount}`} caption="Wardrobe memory" />
        </View>
        <View style={styles.metricGrid}>
          <MetricTile label="Wishlist" value={`${wishlistCount}`} caption="Liked intent signals" />
          <MetricTile label="Budget" value={budgetSummary} caption="Current spend range" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Navigation" title="Move through your style workflow" subtitle="Profile stays the hub for fit, try-on, wardrobe, retail, and recommendation routes.">
        <NavigationCard icon="sliders" title="Measurements" subtitle="Refresh sizing inputs and fit preference." badge={latestMeasurement ? "Ready" : "Pending"} onPress={() => router.push("/measurements")} />
        <NavigationCard icon="camera" title="Try-On" subtitle="Capture or upload a new look with your current profile context." badge={lastTryOnRequestId ? "Recent" : null} onPress={() => router.push("/try-on")} />
        <NavigationCard icon="heart" title="Wardrobe" subtitle="Review saved looks, liked items, and wardrobe memory." badge={`${savedLooksCount}`} onPress={() => router.push("/saved")} />
        <NavigationCard icon="shopping-bag" title="Shops" subtitle="Compare offers and outbound retailer paths." onPress={() => router.push("/retail")} />
        <NavigationCard icon="star" title="Recommendations" subtitle="See ranked picks shaped by fit, color, and budget." onPress={() => router.push("/recommendations")} />
      </SectionCard>

      <SectionCard eyebrow="Wardrobe" title="Saved fits and liked pieces" subtitle="Saved looks sit directly inside profile so the page remains a true hub.">
        <View style={styles.wardrobeGrid}>
          {wardrobeItems.length > 0 ? (
            wardrobeItems.map((look, index) => (
              <View key={look.id} style={styles.wardrobeItem}>
                <View style={[styles.wardrobeThumb, index % 2 === 1 && styles.wardrobeThumbAlt]}>
                  <Text style={styles.wardrobeThumbText}>{look.isWishlist ? "Liked" : "Saved"}</Text>
                </View>
                <View style={styles.wardrobeMeta}>
                  <Text style={styles.wardrobeTitle}>{look.name}</Text>
                  <Text style={styles.wardrobeText}>{look.isWishlist ? "Liked garment" : look.note ?? "Saved just now"}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyWardrobe}>
              <Text style={styles.wardrobeText}>Your next saved fit will appear here.</Text>
            </View>
          )}
        </View>
      </SectionCard>

      {editorOpen ? (
        <SectionCard eyebrow="Identity" title="Update your profile signals" subtitle="Changes save back into the shared profile store so the rest of the app stays synchronized.">
          <View style={styles.inlineRow}>
            <TextInput style={[styles.input, styles.half]} placeholder="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" placeholderTextColor={colors.inkMuted} />
            <TextInput style={[styles.input, styles.half]} placeholder="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" placeholderTextColor={colors.inkMuted} />
          </View>
          <View style={styles.inlineRow}>
            <TextInput style={[styles.input, styles.half]} placeholder="Body shape" value={bodyShape} onChangeText={setBodyShape} placeholderTextColor={colors.inkMuted} />
            <TextInput style={[styles.input, styles.half]} placeholder="Gender" value={gender} onChangeText={setGender} placeholderTextColor={colors.inkMuted} />
          </View>
          <View style={styles.inlineRow}>
            <TextInput style={[styles.input, styles.half]} placeholder="Budget label" value={budgetLabel} onChangeText={setBudgetLabel} placeholderTextColor={colors.inkMuted} />
            <TextInput style={[styles.input, styles.half]} placeholder="Budget max" value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholderTextColor={colors.inkMuted} />
          </View>
          <TextInput style={styles.input} placeholder="Budget min" value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholderTextColor={colors.inkMuted} />

          <Text style={styles.label}>Preferred styles</Text>
          <View style={styles.chipWrap}>
            {suggestedStyles.map((entry) => {
              const active = preferredStyles.includes(entry);
              return (
                <Pressable key={entry} onPress={() => toggleValue(entry, preferredStyles, setPreferredStyles)} style={[styles.selectChip, active && styles.selectChipActive]}>
                  <Text style={[styles.selectChipText, active && styles.selectChipTextActive]}>{entry}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Preferred colors</Text>
          <View style={styles.chipWrap}>
            {suggestedColors.map((entry) => {
              const active = preferredColors.includes(entry);
              return (
                <Pressable key={entry} onPress={() => toggleValue(entry, preferredColors, setPreferredColors)} style={[styles.selectChip, active && styles.selectChipActive]}>
                  <Text style={[styles.selectChipText, active && styles.selectChipTextActive]}>{entry}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Avoided colors</Text>
          <View style={styles.chipWrap}>
            {suggestedColors.map((entry) => {
              const active = avoidedColors.includes(entry);
              return (
                <Pressable key={entry} onPress={() => toggleValue(entry, avoidedColors, setAvoidedColors)} style={[styles.selectChip, active && styles.selectChipActive]}>
                  <Text style={[styles.selectChipText, active && styles.selectChipTextActive]}>{entry}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.editorActions}>
            <PrimaryButton onPress={saveProfile} disabled={saving || !hasIdentity}>
              {saving ? "Saving profile..." : "Save profile"}
            </PrimaryButton>
            <PrimaryButton onPress={() => router.push("/measurements")} variant="secondary">
              Measurements
            </PrimaryButton>
          </View>
        </SectionCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 16
  },
  heroBackdrop: {
    position: "absolute",
    top: -38,
    right: -22,
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    backgroundColor: "#dfe4ff"
  },
  profileHero: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center"
  },
  avatarButton: {
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.pageStrong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: "hidden"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  profileCopy: {
    flex: 1,
    gap: 6
  },
  name: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: fonts.display
  },
  email: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  profileActions: {
    gap: 10
  },
  message: {
    color: colors.brand,
    fontSize: 12,
    lineHeight: 18
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10
  },
  wardrobeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  wardrobeItem: {
    width: "48%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    backgroundColor: colors.panelStrong
  },
  wardrobeThumb: {
    height: 118,
    backgroundColor: "#e7eaff",
    padding: 12,
    justifyContent: "flex-end"
  },
  wardrobeThumbAlt: {
    backgroundColor: "#dce8ff"
  },
  wardrobeThumbText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  wardrobeMeta: {
    padding: 10,
    gap: 3
  },
  wardrobeTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  wardrobeText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18
  },
  emptyWardrobe: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: colors.panelMuted,
    padding: 16
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: 13
  },
  label: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.panelStrong
  },
  selectChipActive: {
    borderColor: "rgba(99,91,255,0.24)",
    backgroundColor: colors.accentSoft
  },
  selectChipText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700"
  },
  selectChipTextActive: {
    color: colors.accent
  },
  editorActions: {
    gap: 10
  },
  pressed: {
    opacity: 0.92
  }
});
