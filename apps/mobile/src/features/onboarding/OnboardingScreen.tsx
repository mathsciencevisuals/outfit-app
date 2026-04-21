import { useRouter } from "expo-router";
import { Text } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";

export function OnboardingScreen() {
  const router = useRouter();
  const { data } = useAsyncResource(() => mobileApi.onboarding(), []);

  return (
    <Screen>
      <SectionCard
        title={data?.title ?? "FitMe"}
        subtitle={data?.subtitle ?? "Build your profile and start discovering better fits."}
      >
        <Text>Capture your style, measurements, and preferred brands to unlock fit-first discovery.</Text>
        <PrimaryButton onPress={() => router.push("/profile")}>Start setup</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
