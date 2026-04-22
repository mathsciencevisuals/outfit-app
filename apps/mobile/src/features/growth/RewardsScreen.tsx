import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MetricTile } from "../../components/MetricTile";
import { Pill } from "../../components/Pill";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Screen } from "../../components/Screen";
import { SectionCard } from "../../components/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";

function reasonLabel(reason: string) {
  return reason
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function prettyLabel(value: string) {
  return value.split("_").join(" ");
}

export function RewardsScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsyncResource(async () => {
    const [wallet, transactions, campaigns] = await Promise.all([
      mobileApi.rewardsWallet(),
      mobileApi.rewardTransactions(),
      mobileApi.campaigns()
    ]);

    return { wallet, transactions, campaigns };
  }, []);

  const highlights = useMemo(() => data?.campaigns.filter((campaign) => campaign.status === "ACTIVE").slice(0, 2) ?? [], [data]);

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Rewards wallet" subtitle="Loading points, reward history, and student campaign perks." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState
          title="Rewards wallet"
          message={error ?? "Rewards could not be loaded."}
          actionLabel="Back to profile"
          onRetry={() => router.push("/profile")}
        />
      </Screen>
    );
  }

  if (!data.wallet) {
    return (
      <Screen>
        <EmptyState
          title="No wallet yet"
          message="Your rewards wallet will appear after your first profile or try-on milestone."
          actionLabel="Start try-on"
          onAction={() => router.push("/tryon-upload")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Student Rewards"
        title="Campus wallet and growth perks"
        subtitle="Points accumulate across try-ons, shares, referrals, profile completion, and challenge activity."
      >
        <View style={styles.row}>
          <Pill label={`${data.wallet.tierLabel} tier`} tone="success" />
          <Pill label={`${data.transactions.length} transactions`} tone="neutral" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Balance" value={`${data.wallet.balancePoints}`} caption="Available points to unlock coupons" />
          <MetricTile label="Earned" value={`${data.wallet.lifetimeEarned}`} caption="Total points earned so far" />
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="Spent" value={`${data.wallet.lifetimeSpent}`} caption="Used on coupon unlocks" />
          <MetricTile label="Campaigns" value={`${highlights.length}`} caption="Active student promos right now" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Reward Triggers" title="How points are moving">
        {data.transactions.length === 0 ? (
          <EmptyState
            title="No reward history yet"
            message="Once actions begin, points history will land here."
            actionLabel="Go to challenges"
            onAction={() => router.push("/challenges")}
          />
        ) : (
          data.transactions.slice(0, 6).map((transaction) => (
            <View key={transaction.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>{reasonLabel(transaction.reason)}</Text>
                <Pill
                  label={`${transaction.type === "SPEND" ? "-" : "+"}${transaction.amountPoints} pts`}
                  tone={transaction.type === "SPEND" ? "warning" : "success"}
                />
              </View>
              <Text style={styles.itemBody}>{transaction.description}</Text>
              <Text style={styles.itemMeta}>Balance after action: {transaction.balanceAfter}</Text>
            </View>
          ))
        )}
        <PrimaryButton onPress={() => router.push("/coupons")} variant="secondary">
          Browse unlockable coupons
        </PrimaryButton>
      </SectionCard>

      <SectionCard eyebrow="Active Promotions" title="Campaigns linked to your wallet">
        {highlights.length === 0 ? (
          <Text style={styles.copy}>No active campaigns are attached right now, but your reward balance is still ready to be used.</Text>
        ) : (
          highlights.map((campaign) => (
            <View key={campaign.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>{campaign.title}</Text>
                <Pill label={prettyLabel(campaign.theme)} tone="accent" />
              </View>
              <Text style={styles.itemBody}>{campaign.description}</Text>
              <Text style={styles.itemMeta}>{campaign.budgetLabel ?? "Student-targeted promotion"}</Text>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
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
  },
  itemBody: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  },
  itemMeta: {
    color: "#8a6d4a",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3
  },
  copy: {
    color: "#5c6679",
    fontSize: 14,
    lineHeight: 21
  }
});
