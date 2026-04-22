import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
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
  const cachedProfile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const logout = useAppStore((state) => state.logout);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading, error } = useAsyncResource(async () => {
    const profile = await mobileApi.profile(userId);
    setProfile(profile);
    return profile;
  }, [userId, refreshKey]);

  const profile = data ?? cachedProfile;

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
  }, [profile]);

  const completionScore = useMemo(
    () =>
      [
        profile?.avatarUrl,
        profile?.heightCm,
        profile?.bodyShape,
        (profile?.preferredColors?.length ?? 0) > 0,
        preferredStyles.length > 0,
        profile?.budgetLabel ?? (profile?.budgetMin != null ? "budget" : null)
      ].filter(Boolean).length,
    [preferredStyles.length, profile]
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
      const nextProfile = await mobileApi.updateProfile(userId, {
        firstName: firstName.trim() || profile.firstName,
        lastName: lastName.trim() || profile.lastName,
        avatarUploadId: profile.avatarUploadId ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        gender: gender.trim() || null,
        age: profile.age ?? null,
        heightCm: profile.heightCm ?? null,
        weightKg: profile.weightKg ?? null,
        bodyShape: bodyShape.trim() || null,
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
      setProfile(nextProfile);
      setMessage("Profile updated");
      setRefreshKey((value) => value + 1);
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled) {
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);
    try {
      const upload = await mobileApi.uploadProfileImage(userId, {
        uri: result.assets[0].uri,
        fileName: result.assets[0].fileName,
        mimeType: result.assets[0].mimeType
      });
      const nextProfile = await mobileApi.updateProfile(userId, {
        firstName: firstName.trim() || profile.firstName,
        lastName: lastName.trim() || profile.lastName,
        avatarUploadId: upload.id,
        avatarUrl: upload.publicUrl,
        gender: gender.trim() || null,
        age: profile.age ?? null,
        heightCm: profile.heightCm ?? null,
        weightKg: profile.weightKg ?? null,
        bodyShape: bodyShape.trim() || null,
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
      setProfile(nextProfile);
      setMessage("Profile photo updated");
      setRefreshKey((value) => value + 1);
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not upload profile image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
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
            {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>Add photo</Text>}
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.pillRow}>
              <Pill label={`${completionScore}/6 core profile signals`} tone={completionScore >= 5 ? "success" : "warning"} />
              <Pill label={profile.bodyShape ?? "Body shape pending"} tone="neutral" />
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
              variant={avoidedColors.includes(color) ? "ghost" : "secondary"}
              size="sm"
              fullWidth={false}
            >
              {color}
            </PrimaryButton>
          ))}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Budget Preference" title="Set your comfort range">
        <TextInput style={styles.input} value={budgetLabel} onChangeText={setBudgetLabel} placeholder="Budget label e.g. Campus under 999" placeholderTextColor="#978b7d" />
        <View style={styles.inlineRow}>
          <TextInput style={[styles.input, styles.half]} value={budgetMin} onChangeText={setBudgetMin} placeholder="Min" keyboardType="numeric" placeholderTextColor="#978b7d" />
          <TextInput style={[styles.input, styles.half]} value={budgetMax} onChangeText={setBudgetMax} placeholder="Max" keyboardType="numeric" placeholderTextColor="#978b7d" />
        </View>
        <PrimaryButton onPress={saveProfile} disabled={saving}>
          {saving ? "Saving profile..." : "Save profile preferences"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Saved Outfits" title="Wishlist and outfit memory">
        <Text style={styles.sectionText}>
          {profile.savedLooks?.length
            ? `You currently have ${profile.savedLooks.length} saved outfit collections visible across recommendations and results.`
            : "No outfits saved yet. Save looks from the try-on result or recommendation screens."}
        </Text>
        <PrimaryButton onPress={() => router.push("/saved-looks")} variant="secondary">
          Open saved outfits / wishlist
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Closet Upload" title="Coming soon">
        <Text style={styles.sectionText}>
          Closet upload is intentionally disabled for now. This future-scoped feature will let you ingest existing wardrobe items without breaking the current flow.
        </Text>
        <PrimaryButton variant="ghost" disabled>
          Closet upload coming soon
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
    borderRadius: 999,
    backgroundColor: "#eadcc7",
    borderWidth: 1,
    borderColor: "#d5c3a8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    color: "#6b5b48",
    fontSize: 13,
    fontWeight: "700"
  },
  heroMeta: {
    flex: 1,
    gap: 8
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  helperText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  message: {
    color: "#5f697d",
    fontSize: 14,
    lineHeight: 21
  },
  actionButtons: {
    gap: 10
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
  inlineRow: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  sectionText: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  },
  subheading: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700"
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  }
});
