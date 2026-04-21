import { useRouter } from "expo-router";
import { Text } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function ProfileScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.profile(userId), [userId]);

  if (loading) return <Screen><SectionCard title="Your profile"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Your profile"><Text>Failed to load profile.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Your profile" subtitle="Foundational details that power fit and style recommendations.">
        <InfoRow label="Name" value={data ? `${data.firstName} ${data.lastName}` : "Demo User"} />
        <InfoRow label="Height" value={data?.heightCm ? `${data.heightCm} cm` : "Add height"} />
        <InfoRow label="Body shape" value={data?.bodyShape ?? "Set your profile"} />
        <Text>Preferred palette: {(data?.preferredColors ?? []).join(", ") || "Not set"}</Text>
        <PrimaryButton onPress={() => router.push("/measurements")}>Continue to measurements</PrimaryButton>
      </SectionCard>
      <PrimaryButton onPress={() => router.push("/discover")}>Skip to discover</PrimaryButton>
    </Screen>
  );
}
