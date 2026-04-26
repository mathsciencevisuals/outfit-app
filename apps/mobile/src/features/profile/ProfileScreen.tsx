import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SmartImage } from "../../components/SmartImage";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius } from "../../theme/design";

function summaryArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const userEmail = useAppStore((state) => state.userEmail);
  const profile = useAppStore((state) => state.profile);
  const logout = useAppStore((state) => state.logout);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void mobileApi.refreshProfile(userId).catch(() => null);
  }, [userId]);

  const displayName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "Demo User";
  const styleOccasions = summaryArray(profile?.stylePreference?.occasions);
  const wardrobeCount = profile?.savedLooks?.length ?? 0;
  const measurementsSummary = `${profile?.heightCm ?? "--"} cm · ${profile?.weightKg ?? "--"} kg · ${profile?.bodyShape ?? "Average"}`;
  const styleSummary = [
    styleOccasions.slice(0, 3).join(", ") || "Casual, Formal",
    (profile?.preferredColors ?? []).slice(0, 3).join(", ") || "Black, Navy",
    String(profile?.stylePreference?.fitPreferenceLabel ?? profile?.fitPreference ?? "Regular")
  ].join(" • ");

  const uploadAvatar = async () => {
    if (!profile) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library permission is required.");
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

    try {
      const asset = result.assets[0];
      const upload = await mobileApi.uploadProfileImage(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType
      });

      await mobileApi.updateProfile(userId, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUploadId: upload.id,
        avatarUrl: upload.publicUrl,
        gender: profile.gender ?? null,
        age: profile.age ?? null,
        heightCm: profile.heightCm ?? null,
        weightKg: profile.weightKg ?? null,
        bodyShape: profile.bodyShape ?? null,
        fitPreference: profile.fitPreference ?? "regular",
        budgetMin: profile.budgetMin ?? null,
        budgetMax: profile.budgetMax ?? null,
        budgetLabel: profile.budgetLabel ?? null,
        closetStatus: profile.closetStatus ?? "ACTIVE",
        stylePreference: profile.stylePreference ?? null,
        preferredColors: profile.preferredColors ?? [],
        avoidedColors: profile.avoidedColors ?? []
      });
      setMessage("Profile photo updated.");
    } catch (nextError: unknown) {
      setMessage(nextError instanceof Error ? nextError.message : "Could not update profile photo.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  const sections = useMemo(
    () => [
      { title: "Measurements", body: measurementsSummary, action: "Edit", route: "/measurements" },
      { title: "Style Preferences", body: styleSummary, action: "Edit", route: "/style-preferences" },
      {
        title: "Budget",
        body: `${profile?.budgetLabel ?? "Mid-Range"} · $${profile?.budgetMax ?? 300} monthly`,
        action: "Edit",
        route: "/budget"
      },
      { title: "Wardrobe Count", body: `${wardrobeCount} saved items`, action: "Open", route: "/saved" },
      { title: "Settings / Theme", body: "Theme toggle placeholder for future account settings.", action: "Open", route: "/account" }
    ],
    [measurementsSummary, profile?.budgetLabel, profile?.budgetMax, styleSummary, wardrobeCount]
  );

  return (
    <Screen tone="dark" showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.heroCard}>
          <Pressable onPress={() => void uploadAvatar()} style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
            <SmartImage uri={profile?.avatarUrl} label={displayName} containerStyle={styles.avatarWrap} style={styles.avatar} fallbackTone="accent" />
          </Pressable>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{userEmail || "demo@fitme.dev"}</Text>
          <PrimaryButton onPress={() => void uploadAvatar()} size="sm" variant="secondary" fullWidth={false}>
            Change Photo
          </PrimaryButton>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={styles.sectionTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
              <Pressable onPress={() => router.push(section.route as never)} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
                <Text style={styles.linkText}>{section.action}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton onPress={() => void handleLogout()} variant="ghost">
          Logout
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  heroCard: {
    alignItems: "center",
    gap: 10,
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  name: {
    color: colors.inkOnDark,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800"
  },
  email: {
    color: colors.inkOnDarkSoft,
    fontSize: 14
  },
  sectionCard: {
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: "rgba(19,21,34,0.86)",
    borderWidth: 1,
    borderColor: colors.lineDark
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  sectionTitle: {
    color: colors.inkOnDark,
    fontSize: 16,
    fontWeight: "700"
  },
  sectionBody: {
    marginTop: 4,
    color: colors.inkOnDarkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  linkText: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: "800"
  },
  message: {
    color: colors.inkOnDark,
    fontSize: 14
  },
  pressed: {
    opacity: 0.92
  }
});
