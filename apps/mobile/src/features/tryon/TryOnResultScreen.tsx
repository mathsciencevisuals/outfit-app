import { useRouter } from "expo-router";
import { Text } from "react-native";

import { InfoRow } from "../../components/InfoRow";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";

export function TryOnResultScreen() {
  const router = useRouter();
  const requestId = useAppStore((state) => state.lastTryOnRequestId);
  const { data, loading, error } = useAsyncResource(
    () => (requestId ? mobileApi.tryOnResult(requestId) : Promise.resolve(null)),
    [requestId]
  );

  if (loading) return <Screen><SectionCard title="Try-on result"><Text>Loading...</Text></SectionCard></Screen>;
  if (error) return <Screen><SectionCard title="Try-on result"><Text>Failed to load result.</Text></SectionCard></Screen>;

  return (
    <Screen>
      <SectionCard title="Try-on result" subtitle="Mock provider output wired through the same abstraction as future providers.">
        <InfoRow label="Status" value={data?.status ?? "No request yet"} />
        <InfoRow
          label="Confidence"
          value={data?.result?.confidence ? `${Math.round(data.result.confidence * 100)}%` : "Pending"}
        />
        <Text>{data?.result?.summary ?? "Submit a try-on request to see generated output details."}</Text>
        <PrimaryButton onPress={() => router.push("/recommendations")}>See recommendations</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
