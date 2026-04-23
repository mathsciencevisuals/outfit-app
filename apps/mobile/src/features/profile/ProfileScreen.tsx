import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { NavigationCard } from "../../components/NavigationCard";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

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

function formatMeasurementValue(value?: number | null) {
  return value != null ? `${Math.round(value)} cm` : "Not added";
}

function formatBudgetSummary(budgetLabel: string, budgetMin: string, budgetMax: string) {
  if (budgetLabel) {
    return budgetLabel;
  }
  if (budgetMin && budgetMax) {
    return `$${budgetMin}-$${budgetMax}`;
  }
  if (budgetMax) {
    return `Up to $${budgetMax}`;
  }
  if (budgetMin) {
    return `From $${budgetMin}`;
  }
  return "Not set";
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
  const budgetSummary = formatBudgetSummary(budgetLabel, budgetMin, budgetMax);
  const hasUnsavedAvatar = avatarDraft != null;
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

  const openEditor = () => {
    setEditorOpen(true);
    setMessage(null);
  };

  const saveProfile = async () => {
    if (!profile || !userId) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await mobileApi.updateProfile(userId, {
        firstName: firstName.trim() || profile.firstName,
        lastName: lastName.trim() || profile.lastName,
        avatarUploadId: avatarDraft?.uploadId ?? profile.avatarUploadId ?? null,
        avatarUrl: avatarDraft?.publicUrl ?? profile.avatarUrl ?? null,
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

      setAvatarDraft({
        uploadId: upload.id,
        publicUrl: upload.publicUrl,
        localUri: asset.uri
      });
      setEditorOpen(true);
      setMessage("Photo uploaded. Save profile to keep it across reloads.");
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
        eyebrow="Account"
        title="Profile"
        subtitle="This is the control surface for identity, fit, style, try-on, and retail follow-up."
      >
        <View style={styles.headerTopBar}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerLabel}>Profile hub</Text>
            <Text style={styles.headerTitle}>{displayName}</Text>
            <Text style={styles.headerSubtitle}>{userEmail || "Email unavailable"}</Text>
          </View>
          <PrimaryButton onPress={handleLogout} variant="ghost" fullWidth={false}>
            Logout
          </PrimaryButton>
        </View>

        <View style={styles.heroPanel}>
          <View style={styles.avatarColumn}>
            <View style={styles.avatarWrap}>
              {avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>Add photo</Text>}
            </View>
            <Pressable onPress={pickAvatar} disabled={uploadingAvatar} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressedButton]}>
              <Feather name="camera" size={14} color="#182033" />
              <Text style={styles.avatarButtonText}>{uploadingAvatar ? "Uploading..." : "Change photo"}</Text>
            </Pressable>
          </View>

          <View style={styles.heroMeta}>
            <View style={styles.heroPills}>
              <Pill label={`${completionScore}/6 complete`} tone={completionScore >= 5 ? "success" : "warning"} />
              <Pill label={profile.fitPreference ?? "regular"} tone="info" />
              <Pill label={profile.bodyShape ?? "Body shape pending"} tone="neutral" />
              {hasUnsavedAvatar ? <Pill label="Photo pending save" tone="warning" /> : null}
            </View>
            <Text style={styles.heroCopy}>
              Your uploaded portrait is reused in try-on and restored after reload once it is saved to the profile record.
            </Text>
            <View style={styles.heroActions}>
              <PrimaryButton onPress={openEditor} variant="secondary" fullWidth={false}>
                Edit profile
              </PrimaryButton>
              <PrimaryButton onPress={saveProfile} disabled={saving || uploadingAvatar} fullWidth={false}>
                {saving ? "Saving..." : hasUnsavedAvatar ? "Save photo + profile" : "Save changes"}
              </PrimaryButton>
            </View>
          </View>
        </View>

        <View style={styles.metricRow}>
          <MetricTile
            label="Measurements"
            value={latestMeasurement ? "Live" : "Pending"}
            caption={latestMeasurement ? "Fit baseline captured" : "Add chest, waist, hips, and inseam"}
          />
          <MetricTile
            label="Saved looks"
            value={`${savedLooksCount}`}
            caption={wishlistCount > 0 ? `${wishlistCount} wishlist` : "Wishlist not populated yet"}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </SectionCard>

      <SectionCard
        eyebrow="Overview"
        title="Quick status"
        subtitle="Keep key profile signals visible even when you are not inside the editor."
      >
        <View style={styles.summaryGrid}>
          <Pressable onPress={() => router.push("/measurements")} style={({ pressed }) => [styles.summaryCard, pressed && styles.pressedCard]}>
            <Text style={styles.summaryLabel}>Body measurements</Text>
            <Text style={styles.summaryValue}>{latestMeasurement ? "Ready" : "Missing"}</Text>
            <Text style={styles.summaryText}>
              Chest {formatMeasurementValue(latestMeasurement?.chestCm)} · Waist {formatMeasurementValue(latestMeasurement?.waistCm)}
            </Text>
          </Pressable>

          <Pressable onPress={openEditor} style={({ pressed }) => [styles.summaryCard, pressed && styles.pressedCard]}>
            <Text style={styles.summaryLabel}>Style preferences</Text>
            <Text style={styles.summaryValue}>{preferredStyles.length > 0 ? `${preferredStyles.length} saved` : "Not set"}</Text>
            <Text style={styles.summaryText}>
              {preferredStyles.length > 0 ? preferredStyles.join(", ") : "Choose silhouette direction and palette cues."}
            </Text>
          </Pressable>

          <Pressable onPress={openEditor} style={({ pressed }) => [styles.summaryCard, pressed && styles.pressedCard]}>
            <Text style={styles.summaryLabel}>Budget preference</Text>
            <Text style={styles.summaryValue}>{budgetSummary}</Text>
            <Text style={styles.summaryText}>Budget range influences ranking, alternatives, and the shop handoff logic.</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/saved-looks")} style={({ pressed }) => [styles.summaryCard, pressed && styles.pressedCard]}>
            <Text style={styles.summaryLabel}>Saved looks / wishlist</Text>
            <Text style={styles.summaryValue}>{savedLooksCount > 0 ? `${savedLooksCount} saved` : "Empty"}</Text>
            <Text style={styles.summaryText}>Jump back into outfits, wishlist items, and follow-up retail actions.</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Navigate"
        title="Go deeper"
        subtitle="Important routes should stay visible from profile so users are never stranded behind hidden controls."
      >
        <View style={styles.navigationList}>
          <NavigationCard
            icon="maximize-2"
            title="Measurements"
            subtitle="Review fit inputs and your latest sizing baseline."
            badge={latestMeasurement ? "live" : "setup"}
            onPress={() => router.push("/measurements")}
          />
          <NavigationCard
            icon="sliders"
            title="Style Preferences"
            subtitle="Open the editor and tune style tags, palette, and fit posture."
            badge={`${preferredStyles.length} tags`}
            onPress={openEditor}
          />
          <NavigationCard
            icon="dollar-sign"
            title="Budget Preferences"
            subtitle="Set the price comfort zone that drives ranking and shop comparison."
            badge={budgetLabel || budgetMin || budgetMax ? "set" : "edit"}
            onPress={openEditor}
          />
          <NavigationCard
            icon="heart"
            title="Saved Looks"
            subtitle="Review saved outfits, wishlist context, and follow-up commerce actions."
            badge={`${savedLooksCount}`}
            onPress={() => router.push("/saved-looks")}
          />
          <NavigationCard
            icon="image"
            title="Try-On History"
            subtitle="Return to the latest try-on result and generated look state."
            badge={lastTryOnRequestId ? "latest ready" : "start"}
            onPress={() => router.push("/tryon-result")}
          />
          <NavigationCard
            icon="star"
            title="Recommendations"
            subtitle="Open the ranked shortlist driven by fit, style, budget, and saved looks."
            onPress={() => router.push("/recommendations")}
          />
          <NavigationCard
            icon="shopping-bag"
            title="Shops"
            subtitle="Compare current retailer options, stock, and best handoff paths."
            onPress={() => router.push("/shops")}
          />
        </View>
      </SectionCard>

      {editorOpen ? (
        <>
          <SectionCard
            eyebrow="Identity"
            title="Edit profile details"
            subtitle="Identity and preference edits stay below the dashboard so the top-level profile hierarchy remains clear."
          >
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Name</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#8f816f"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#8f816f"
                />
              </View>
            </View>

            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={gender}
                onChangeText={setGender}
                placeholder="Gender"
                placeholderTextColor="#8f816f"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={bodyShape}
                onChangeText={setBodyShape}
                placeholder="Body shape"
                placeholderTextColor="#8f816f"
              />
            </View>

            {!hasIdentity ? <Text style={styles.helperNote}>Adding name details helps the header feel personal and anchored.</Text> : null}
          </SectionCard>

          <SectionCard
            eyebrow="Preferences"
            title="Style and budget"
            subtitle="These settings feed recommendations, saved look relevance, and shop comparison."
          >
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Budget label</Text>
              <TextInput
                style={styles.input}
                value={budgetLabel}
                onChangeText={setBudgetLabel}
                placeholder="Budget, premium, capsule..."
                placeholderTextColor="#8f816f"
              />
            </View>

            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder="Budget min"
                placeholderTextColor="#8f816f"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={budgetMax}
                onChangeText={setBudgetMax}
                placeholder="Budget max"
                placeholderTextColor="#8f816f"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.sectionText}>Tap the styles and colors you want the recommendation engine to prioritize.</Text>

            <View style={styles.preferenceBlock}>
              <Text style={styles.subheading}>Preferred styles</Text>
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
            </View>

            <View style={styles.preferenceBlock}>
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
            </View>

            <View style={styles.preferenceBlock}>
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
            </View>

            <View style={styles.editorActions}>
              <PrimaryButton onPress={saveProfile} disabled={saving || uploadingAvatar}>
                {saving ? "Saving..." : "Save profile"}
              </PrimaryButton>
              <PrimaryButton onPress={() => setEditorOpen(false)} variant="ghost">
                Close editor
              </PrimaryButton>
            </View>
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerTitleBlock: {
    flex: 1,
    gap: 4
  },
  headerLabel: {
    color: "#846746",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  headerTitle: {
    color: "#182033",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700"
  },
  headerSubtitle: {
    color: "#637082",
    fontSize: 15,
    lineHeight: 22
  },
  heroPanel: {
    borderRadius: 26,
    backgroundColor: "#f9f3ea",
    borderWidth: 1,
    borderColor: "#e5d7c0",
    padding: 18,
    gap: 16
  },
  avatarColumn: {
    alignItems: "flex-start",
    gap: 10
  },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#eadcc9",
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    color: "#6f583f",
    fontWeight: "700"
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#efe3cf",
    borderWidth: 1,
    borderColor: "#dcc8ab"
  },
  pressedButton: {
    opacity: 0.92
  },
  avatarButtonText: {
    color: "#182033",
    fontSize: 13,
    fontWeight: "700"
  },
  heroMeta: {
    gap: 12
  },
  heroPills: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  heroCopy: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  message: {
    color: "#5f697d",
    fontSize: 14,
    lineHeight: 20
  },
  summaryGrid: {
    gap: 12
  },
  summaryCard: {
    borderRadius: 22,
    backgroundColor: "#faf5ee",
    borderWidth: 1,
    borderColor: "#e5d6c0",
    padding: 16,
    gap: 8
  },
  pressedCard: {
    opacity: 0.94
  },
  summaryLabel: {
    color: "#836b4d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  summaryValue: {
    color: "#182033",
    fontSize: 21,
    fontWeight: "700"
  },
  summaryText: {
    color: "#616b7d",
    fontSize: 13,
    lineHeight: 20
  },
  navigationList: {
    gap: 12
  },
  inputGroup: {
    gap: 8
  },
  fieldLabel: {
    color: "#7c6347",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  helperNote: {
    color: "#6a7280",
    fontSize: 13,
    lineHeight: 20
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10
  },
  halfInput: {
    flex: 1
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2d3bd",
    backgroundColor: "#fcf8f2",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#182033"
  },
  sectionText: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21
  },
  preferenceBlock: {
    gap: 10
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  subheading: {
    color: "#182033",
    fontSize: 14,
    fontWeight: "700"
  },
  editorActions: {
    gap: 10
  }
});
