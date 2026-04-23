import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

const suggestedStyles = ["minimal", "smart", "sport", "streetwear", "tailored", "casual"];
const suggestedColors = ["black", "white", "olive", "navy", "cream", "camel", "gray"];

function parseStyleList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const profile = useAppStore((state) => state.profile);
  const profileVersion = useAppStore((state) => state.profileVersion);
  const logout = useAppStore((state) => state.logout);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

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
    if (profile.avatarUrl) {
      setLocalAvatarUri(null);
    }
  }, [profile, profileVersion]);

  const latestMeasurement = profile?.measurements?.[0] ?? null;
  const avatarSource = localAvatarUri ?? profile?.avatarUrl ?? null;

  const completionScore = useMemo(
    () =>
      [
        avatarSource,
        profile?.heightCm,
        profile?.bodyShape,
        (profile?.preferredColors?.length ?? 0) > 0,
        preferredStyles.length > 0,
        profile?.budgetLabel ?? (profile?.budgetMin != null ? "budget" : null)
      ].filter(Boolean).length,
    [avatarSource, preferredStyles.length, profile]
  );

  const toggleValue = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const saveProfile = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.updateProfile(userId, {
        firstName: firstName.trim() || profile.firstName,
        lastName: lastName.trim() || profile.lastName,
        avatarUploadId: profile.avatarUploadId ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        gender: gender.trim() || null,
        age: profile.age ?? null,
        heightCm: profile.heightCm ?? null,
        weightKg: profile.weightKg ?? null,
        bodyShape: bodyShape.trim() || null,
        fitPreference: profile.fitPreference ?? "regular",
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        budgetLabel: budgetLabel.trim() || null,
        closetStatus: profile.closetStatus ?? "COMING_SOON",
        stylePreference: {
          ...(profile.stylePreference ?? {}),
          preferredStyles
        },
        preferredColors,
        avoidedColors
      });
      await refreshProfile();
      setMessage("Profile updated");
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!profile) {
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
    setLocalAvatarUri(asset.uri);
    try {
      const upload = await mobileApi.uploadProfileImage(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType
      });

      await mobileApi.updateProfile(userId, {
        firstName: firstName.trim() || profile.firstName,
        lastName: lastName.trim() || profile.lastName,
        avatarUploadId: upload.id,
        avatarUrl: upload.publicUrl,
        gender: gender.trim() || null,
        age: profile.age ?? null,
        heightCm: profile.heightCm ?? null,
        weightKg: profile.weightKg ?? null,
        bodyShape: bodyShape.trim() || null,
        fitPreference: profile.fitPreference ?? "regular",
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        budgetLabel: budgetLabel.trim() || null,
        closetStatus: profile.closetStatus ?? "COMING_SOON",
        stylePreference: {
          ...(profile.stylePreference ?? {}),
          preferredStyles
        },
        preferredColors,
        avoidedColors
      });

      await refreshProfile();
      setLocalAvatarUri(null);
      setMessage("Profile photo updated");
    } catch (nextError: unknown) {
      setLocalAvatarUri(null);
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
        <LoadingState title="Your profile" subtitle="Loading identity, fit, preferences, and uploaded images." />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <ErrorState
          title="Your profile"
          message={error}
          actionLabel="Go to onboarding"
          onRetry={() => router.push("/onboarding")}
        />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState
          title="Profile missing"
          message="Sign in again to rehydrate your profile state."
          actionLabel="Go to auth"
          onAction={() => router.push("/auth")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Profile Management"
        title={`${firstName || profile.firstName} ${lastName || profile.lastName}`}
        subtitle="Keep your identity, photo, measurements, taste, and budget synced so recommendations and try-on quality stay stable."
      >
        <View style={styles.heroTop}>
          <View style={styles.avatarWrap}>
            {avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>Add photo</Text>}
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.pillRow}>
              <Pill label={`${completionScore}/6 core profile signals`} tone={completionScore >= 5 ? "success" : "warning"} />
              <Pill label={profile.bodyShape ?? "Body shape pending"} tone="neutral" />
              {uploadingAvatar ? <Pill label="Syncing photo" tone="info" /> : null}
            </View>
            <Text style={styles.helperText}>Your uploaded self image is reused across profile and try-on flows.</Text>
          </View>
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Palette" value={`${preferredColors.length}`} caption="Preferred color anchors" />
          <MetricTile label="Styles" value={`${preferredStyles.length}`} caption="Saved preference tags" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Budget" value={budgetLabel || (budgetMax ? `${budgetMax}` : "Add")} caption="Shopping comfort zone" />
          <MetricTile label="Looks" value={`${profile.savedLooks?.length ?? 0}`} caption="Saved outfits and wishlist" />
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.actionButtons}>
          <PrimaryButton onPress={pickAvatar} variant="secondary" disabled={uploadingAvatar}>
            {uploadingAvatar ? "Uploading photo..." : "Upload self picture"}
          </PrimaryButton>
          <PrimaryButton onPress={handleLogout} variant="ghost">
            Logout
          </PrimaryButton>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Identity" title="Profile details">
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#978b7d" />
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#978b7d" />
        <TextInput style={styles.input} value={gender} onChangeText={setGender} placeholder="Gender" placeholderTextColor="#978b7d" />
        <TextInput style={styles.input} value={bodyShape} onChangeText={setBodyShape} placeholder="Body shape" placeholderTextColor="#978b7d" />
      </SectionCard>

      <SectionCard eyebrow="Measurements" title="Fit calibration">
        <View style={styles.metricRow}>
          <MetricTile label="Chest" value={latestMeasurement?.chestCm != null ? `${latestMeasurement.chestCm}` : "--"} caption="cm" />
          <MetricTile label="Waist" value={latestMeasurement?.waistCm != null ? `${latestMeasurement.waistCm}` : "--"} caption="cm" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Hips" value={latestMeasurement?.hipsCm != null ? `${latestMeasurement.hipsCm}` : "--"} caption="cm" />
          <MetricTile label="Inseam" value={latestMeasurement?.inseamCm != null ? `${latestMeasurement.inseamCm}` : "--"} caption="cm" />
        </View>
        <Text style={styles.sectionText}>
          {latestMeasurement
            ? "Measurements are live and editable. Update them when your fit baseline changes."
            : "No measurements saved yet. Add chest, waist, hips, and inseam to improve fit confidence."}
        </Text>
        <PrimaryButton onPress={() => router.push("/measurements")} variant="secondary">
          {latestMeasurement ? "Edit measurements" : "Add measurements"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Style Preferences" title="How recommendations should feel">
        <Text style={styles.sectionText}>Tap the styles and colors you want the recommendation engine to prioritize.</Text>
        <View style={styles.choiceRow}>
          {suggestedStyles.map((style) => (
            <PrimaryButton
              key={style}
              onPress={() => toggleValue(style, preferredStyles, setPreferredStyles)}
              variant={preferredStyles.includes(style) ? "primary" : "secondary"}
              size="sm"
              fullWidth={false}
            >
              {style}
            </PrimaryButton>
          ))}
        </View>
        <Text style={styles.subheading}>Preferred colors</Text>
        <View style={styles.choiceRow}>
          {suggestedColors.map((color) => (
            <PrimaryButton
              key={color}
              onPress={() => toggleValue(color, preferredColors, setPreferredColors)}
              variant={preferredColors.includes(color) ? "primary" : "secondary"}
              size="sm"
              fullWidth={false}
            >
              {color}
            </PrimaryButton>
          ))}
        </View>
        <Text style={styles.subheading}>Avoided colors</Text>
        <View style={styles.choiceRow}>
          {suggestedColors.map((color) => (
            <PrimaryButton
              key={`avoid-${color}`}
              onPress={() => toggleValue(color, avoidedColors, setAvoidedColors)}
              variant={avoidedColors.includes(color) ? "primary" : "secondary"}
              size="sm"
              fullWidth={false}
            >
              {color}
            </PrimaryButton>
          ))}
        </View>
        <PrimaryButton onPress={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </PrimaryButton>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#eadcc7",
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    color: "#715a3f",
    fontWeight: "700"
  },
  heroMeta: {
    flex: 1,
    gap: 8
  },
  helperText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButtons: {
    gap: 10
  },
  message: {
    color: "#5f697d",
    fontSize: 14
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4d7c5",
    backgroundColor: "#fbf8f3",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#172033"
  },
  sectionText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  subheading: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700"
  }
});
