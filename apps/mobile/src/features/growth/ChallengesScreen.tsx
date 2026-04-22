import { useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";

export function ChallengesScreen() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, error } = useAsyncResource(async () => {
    const [campaigns, participation] = await Promise.all([
      mobileApi.challenges(),
      mobileApi.challengeParticipation()
    ]);
    return { campaigns, participation };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const join = async (campaignId: string) => {
    try {
      setBusyId(campaignId);
      await mobileApi.joinChallenge(campaignId);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (campaignId: string) => {
    try {
      setBusyId(campaignId);
      await mobileApi.completeChallenge(campaignId);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Challenges" subtitle="Loading live campaign challenges and student participation state." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState
          title="Challenges"
          message={error ?? "Challenges could not be loaded."}
          actionLabel="Back to discover"
          onRetry={() => router.push("/discover")}
        />
      </Screen>
    );
  }

  if (data.campaigns.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No challenges live"
          message="Student campaign challenges will appear here when active promotions are launched."
          actionLabel="See rewards"
          onAction={() => router.push("/rewards")}
        />
      </Screen>
    );
  }

  const claimedCount = data.participation.filter((item) => item.status === "CLAIMED").length;

  return (
    <Screen>
      <SectionCard
        eyebrow="Campus Challenges"
        title="Earn points through campaign participation"
        subtitle="Join themed student campaigns like campus casual, interview ready, fest looks, and budget edits."
      >
        <View style={styles.metricRow}>
          <MetricTile label="Live" value={`${data.campaigns.length}`} caption="Active student challenge campaigns" />
          <MetricTile label="Claimed" value={`${claimedCount}`} caption="Challenges already converted to points" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Challenge Feed" title="Student campaign lineup">
        {data.campaigns.map((campaign) => {
          const participation = campaign.participation;
          const isBusy = busyId === campaign.id;

          return (
            <View key={campaign.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.copyBlock}>
                  <Text style={styles.title}>{campaign.title}</Text>
                  <Text style={styles.body}>{campaign.description}</Text>
                </View>
                <Pill label={participation?.status ?? "OPEN"} tone={participation?.status === "CLAIMED" ? "success" : "accent"} />
              </View>
              <View style={styles.row}>
                <Pill label={campaign.theme.split("_").join(" ")} tone="neutral" />
                {campaign.budgetLabel ? <Pill label={campaign.budgetLabel} tone="warning" /> : null}
              </View>
              <Text style={styles.meta}>
                {campaign.banners?.[0]?.subtitle ?? "Campaign-backed challenge with rewards and conversion hooks."}
              </Text>
              {!participation ? (
                <PrimaryButton onPress={() => join(campaign.id)} disabled={isBusy}>
                  {isBusy ? "Joining..." : "Join challenge"}
                </PrimaryButton>
              ) : participation.status === "CLAIMED" ? (
                <PrimaryButton variant="ghost" disabled>
                  Reward claimed
                </PrimaryButton>
              ) : (
                <PrimaryButton onPress={() => complete(campaign.id)} disabled={isBusy} variant="secondary">
                  {isBusy ? "Claiming..." : `Claim ${participation.rewardPoints} pts`}
                </PrimaryButton>
              )}
            </View>
          );
        })}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 16,
    gap: 10
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  copyBlock: {
    flex: 1,
    gap: 6
  },
  title: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700"
  },
  body: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  meta: {
    color: "#8a6d4a",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3
  }
});
