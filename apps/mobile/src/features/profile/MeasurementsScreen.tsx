import { useRouter } from "expo-router";
import { Text } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function MeasurementsScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.measurements(userId), [userId]);
  const latest = data?.[0] ?? null;

  if (loading) return <Screen><SectionCard title="Measurements"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Measurements"><Text>Failed to load measurements.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Measurements" subtitle="FitMe uses these metrics to score garments against size charts.">
        <InfoRow label="Chest" value={latest?.chestCm ? `${latest.chestCm} cm` : "Not set"} />
        <InfoRow label="Waist" value={latest?.waistCm ? `${latest.waistCm} cm` : "Not set"} />
        <InfoRow label="Hips" value={latest?.hipsCm ? `${latest.hipsCm} cm` : "Not set"} />
        <InfoRow label="Inseam" value={latest?.inseamCm ? `${latest.inseamCm} cm` : "Not set"} />
        <Text>Measurements can come from manual input, profile setup, or try-on calibration.</Text>
        <PrimaryButton onPress={() => router.push("/discover")}>Go to discover</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
