import { Text } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";

export function AuthScreen() {
  return (
    <Screen>
      <SectionCard title="Account access" subtitle="Demo credentials can be wired into the auth endpoints.">
        <Text>Use `demo@fitme.dev / fitme1234` after seeding the API.</Text>
        <PrimaryButton>Continue</PrimaryButton>
      </SectionCard>
    </Screen>
  );
}
