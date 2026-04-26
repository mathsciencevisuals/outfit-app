import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";
import type { UserProfile } from "../../types/api";

type AvatarDraft = {
  uploadId: string;
  publicUrl: string;
  localUri: string;
} | null;

function parsePreferredStyles(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
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
  const avatarSource = avatarDraft?.localUri ?? avatarDraft?.publicUrl ?? profile?.avatarUrl ?? null;
  const savedLooks = profile?.savedLooks ?? [];
  const displayName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "fitcheck.ai user";
  const styleSummary = parsePreferredStyles(profile?.stylePreference?.preferredStyles).slice(0, 2).join(" • ") || "Style profile";

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
      <Screen>
        <LoadingState title="Profile" subtitle="Loading your wardrobe and account controls." />
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
        <EmptyState title="Profile missing" message="There is no profile data loaded for this account yet." actionLabel="Onboarding" onAction={() => router.push("/onboarding")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard eyebrow="Profile" title="Wardrobe" subtitle="Saved fits, account controls, measurements, and style identity all live here.">
        <View style={styles.appbar}>
          <Pressable onPress={() => router.push("/saved")} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Text style={styles.iconText}>☰</Text>
          </Pressable>
          <View style={styles.appbarCopy}>
            <Text style={styles.appbarTitle}>Wardrobe</Text>
            <Text style={styles.appbarSub}>Saved fits and account.</Text>
          </View>
          <Pressable onPress={() => void handleLogout()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Text style={styles.iconText}>⎋</Text>
          </Pressable>
        </View>

        <View style={styles.profileHead}>
          <Pressable onPress={pickAvatar} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
            {avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatarImage} /> : <Text style={styles.avatarFallback}>AI</Text>}
          </Pressable>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.mail}>{userEmail || "student@campus.com"}</Text>
            <View style={styles.row}>
              <Pill label={`${savedLooks.length} saved fits`} tone="success" />
              <Pill label={styleSummary} tone="neutral" />
              {uploadingAvatar ? <Pill label="Uploading..." tone="info" /> : null}
              {userRole === "ADMIN" || userRole === "OPERATOR" ? <Pill label="Admin tools" tone="accent" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricTile label="Fit" value={latestMeasurement ? "92%" : "--"} caption="Current confidence" />
          <MetricTile label="Looks" value={`${savedLooks.length}`} caption="Saved wardrobe entries" />
          <MetricTile label="Budget" value={budgetLabel || "Open"} caption="Current spend label" />
        </View>

        <View style={styles.grid}>
          {savedLooks.slice(0, 4).map((look, index) => (
            <View key={look.id} style={styles.wardCard}>
              <View style={[styles.thumb, index % 2 === 1 && styles.thumbAlt]} />
              <View style={styles.meta}>
                <Text style={styles.metaTitle}>{look.name}</Text>
                <Text style={styles.metaText}>{look.note ?? (look.isWishlist ? "Liked garment" : "Saved just now")}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Profile controls</Text>
          <Text style={styles.panelBody}>
            Change photo, logout, measurements, privacy, notifications, and style presets from this hub.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          value={budgetLabel}
          onChangeText={setBudgetLabel}
          placeholder="Budget label"
          placeholderTextColor={colors.inkMuted}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.buttonRow}>
          <PrimaryButton onPress={() => void saveBudgetLabel()}>Save profile</PrimaryButton>
          <PrimaryButton onPress={() => router.push("/measurements")} variant="secondary">
            Measurements
          </PrimaryButton>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appbar: {
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
    borderColor: colors.lineStrong,
    backgroundColor: colors.panelStrong
  },
  iconText: {
    color: colors.ink,
    fontSize: 16
  },
  appbarCopy: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  appbarTitle: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "800"
  },
  appbarSub: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17
  },
  profileHead: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
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
    fontSize: 20,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1,
    gap: 4
  },
  name: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  mail: {
    color: colors.inkSoft,
    fontSize: 12
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  wardCard: {
    width: "48%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong
  },
  thumb: {
    height: 108,
    backgroundColor: "#eadfd6"
  },
  thumbAlt: {
    backgroundColor: "#d9e2ff"
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
    fontSize: 11.5
  },
  panel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6
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
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.panelStrong,
    color: colors.ink,
    fontSize: 14
  },
  message: {
    color: colors.brand,
    fontSize: 12,
    lineHeight: 18
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  pressed: {
    opacity: 0.9
  }
});
