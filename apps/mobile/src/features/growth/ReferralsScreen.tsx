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

export function ReferralsScreen() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error } = useAsyncResource(async () => {
    const [code, events] = await Promise.all([mobileApi.referralCode(), mobileApi.referralEvents()]);
    return { code, events };
  }, [refreshKey]);

  const sendInvite = async () => {
    try {
      setSubmitting(true);
      await mobileApi.createReferralEvent({
        eventType: "INVITE_SENT",
        metadata: { channel: "campus_share_sheet" }
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Referrals" subtitle="Loading your invite code and student referral performance." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState
          title="Referrals"
          message={error ?? "Referral data could not be loaded."}
          actionLabel="Back to rewards"
          onRetry={() => router.push("/rewards")}
        />
      </Screen>
    );
  }

  const convertedCount = data.events.filter((event) => event.eventType === "CONVERTED").length;
  const inviteCount = data.events.filter((event) => event.eventType === "INVITE_SENT").length;

  return (
    <Screen>
      <SectionCard
        eyebrow="Referral Engine"
        title="Invite friends and earn campus points"
        subtitle="The referral flow tracks code creation, sends, conversions, and the reward value attached to each event."
      >
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your code</Text>
          <Text style={styles.codeValue}>{data.code.code}</Text>
          <Text style={styles.copy}>Use this code for student invite campaigns, creator shares, and peer recommendations.</Text>
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Invites" value={`${inviteCount}`} caption="Referral shares tracked" />
          <MetricTile label="Converted" value={`${convertedCount}`} caption="Friends who completed signup" />
        </View>
        <PrimaryButton onPress={sendInvite} disabled={submitting}>
          {submitting ? "Logging invite..." : "Log invite sent"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Event Log" title="Referral history">
        {data.events.length === 0 ? (
          <EmptyState
            title="No referral events yet"
            message="Start with your first invite to begin the referral reward loop."
            actionLabel="Send first invite"
            onAction={sendInvite}
          />
        ) : (
          data.events.map((event) => (
            <View key={event.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>{event.eventType.split("_").join(" ")}</Text>
                <Pill label={`${event.rewardPoints ?? 0} pts`} tone={(event.rewardPoints ?? 0) > 0 ? "success" : "neutral"} />
              </View>
              <Text style={styles.copy}>
                {event.metadata ? JSON.stringify(event.metadata) : "Tracked through the referral event pipeline."}
              </Text>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  codeCard: {
    borderRadius: 22,
    backgroundColor: "#172033",
    padding: 18,
    gap: 8
  },
  codeLabel: {
    color: "#d5c3a8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1
  },
  codeValue: {
    color: "#fffaf5",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.6
  },
  copy: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  },
  itemCard: {
    borderRadius: 22,
    backgroundColor: "#fbf8f3",
    borderWidth: 1,
    borderColor: "#eadcc7",
    padding: 14,
    gap: 8
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  itemTitle: {
    flex: 1,
    color: "#172033",
    fontSize: 16,
    fontWeight: "700"
  }
});
