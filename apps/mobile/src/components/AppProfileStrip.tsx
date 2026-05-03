import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "../store/app-store";
import { colors, radius } from "../theme/design";
import { Pill } from "./Pill";

export function AppProfileStrip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useAppStore((state) => state.profile);
  const userEmail = useAppStore((state) => state.userEmail);
  const logout = useAppStore((state) => state.logout);

  const displayName =
    `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || userEmail || "Fit profile";
  const measurementCount = profile?.measurements?.filter(
    (entry: any) =>
      entry.chestCm != null ||
      entry.waistCm != null ||
      entry.hipsCm != null ||
      entry.inseamCm != null ||
      entry.shoulderCm != null ||
      entry.footLengthCm != null
  ).length;
  const canExitToFeed = pathname !== "/dashboard";

  const handleLogout = async () => {
    await logout();
    (router as { dismissAll?: () => void }).dismissAll?.();
    router.replace("/auth");
  };

  return (
    <View style={[styles.card, tone === "dark" && styles.cardDark]}>
      <View style={styles.identityRow}>
        <View style={[styles.avatarShell, tone === "dark" && styles.avatarShellDark]}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <Feather name="user" size={18} color={tone === "dark" ? colors.inkOnDark : colors.ink} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, tone === "dark" && styles.nameDark]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.subline, tone === "dark" && styles.sublineDark]} numberOfLines={1}>
            {profile?.fitPreference ?? "regular"} fit · {measurementCount ? `${measurementCount} saved measurement set` : "measurements pending"}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Pill label={measurementCount ? "Measurements ready" : "Measurements needed"} tone={measurementCount ? "success" : "warning"} />
        <Pill label={`${profile?.savedLooks?.length ?? 0} wardrobe items`} tone="accent" />
      </View>

      <View style={styles.actions}>
        <StripButton label="Profile" icon="user" onPress={() => router.push("/profile-main" as never)} tone={tone} />
        <StripButton label="Measurements" icon="sliders" onPress={() => router.push("/measurements")} tone={tone} />
        {canExitToFeed ? <StripButton label="Exit" icon="x" onPress={() => router.push("/dashboard" as never)} tone={tone} /> : null}
        <StripButton label="Logout" icon="log-out" onPress={() => void handleLogout()} tone={tone} destructive />
      </View>
    </View>
  );
}

function StripButton({
  label,
  icon,
  onPress,
  tone,
  destructive = false
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  tone: "light" | "dark";
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "dark" ? styles.buttonDark : styles.buttonLight,
        destructive && styles.buttonDanger,
        pressed && styles.pressed
      ]}
    >
      <Feather
        name={icon}
        size={14}
        color={destructive ? colors.danger : tone === "dark" ? colors.inkOnDark : colors.ink}
      />
      <Text
        style={[
          styles.buttonText,
          tone === "dark" && styles.buttonTextDark,
          destructive && styles.buttonTextDanger
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.line
  },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.lineDark
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarShell: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pageStrong
  },
  avatarShellDark: {
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  copy: {
    flex: 1,
    gap: 3
  },
  name: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  nameDark: {
    color: colors.inkOnDark
  },
  subline: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17
  },
  sublineDark: {
    color: colors.inkOnDarkSoft
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1
  },
  buttonLight: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.lineStrong
  },
  buttonDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.lineDark
  },
  buttonDanger: {
    borderColor: "rgba(213,91,103,0.24)"
  },
  buttonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  buttonTextDark: {
    color: colors.inkOnDark
  },
  buttonTextDanger: {
    color: colors.danger
  },
  pressed: {
    opacity: 0.9
  }
});
