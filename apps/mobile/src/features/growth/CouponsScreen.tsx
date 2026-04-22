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
import type { Coupon } from "../../types/api";

function couponStatus(coupon: Coupon) {
  const redemption = coupon.redemptions?.[0];
  return redemption?.status ?? "AVAILABLE";
}

export function CouponsScreen() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyCouponId, setBusyCouponId] = useState<string | null>(null);
  const { data, loading, error } = useAsyncResource(async () => {
    const [wallet, coupons, redemptions] = await Promise.all([
      mobileApi.rewardsWallet(),
      mobileApi.coupons(),
      mobileApi.couponRedemptions()
    ]);
    return { wallet, coupons, redemptions };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const unlock = async (couponId: string) => {
    try {
      setBusyCouponId(couponId);
      await mobileApi.unlockCoupon(couponId);
      refresh();
    } finally {
      setBusyCouponId(null);
    }
  };

  const redeem = async (couponId: string) => {
    try {
      setBusyCouponId(couponId);
      await mobileApi.redeemCoupon(couponId);
      refresh();
    } finally {
      setBusyCouponId(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState title="Coupons" subtitle="Loading unlocked offers, thresholds, and student promotions." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState
          title="Coupons"
          message={error ?? "Coupon inventory could not be loaded."}
          actionLabel="Back to rewards"
          onRetry={() => router.push("/rewards")}
        />
      </Screen>
    );
  }

  if (data.coupons.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No coupons yet"
          message="Coupons appear here when campaigns or reward thresholds are active."
          actionLabel="Go to challenges"
          onAction={() => router.push("/challenges")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        eyebrow="Coupon Wallet"
        title="Unlock offers with rewards"
        subtitle="Coupons can unlock through points or thresholds and are tied back to student-focused campaigns."
      >
        <View style={styles.metricRow}>
          <MetricTile label="Points" value={`${data.wallet.balancePoints}`} caption="Available for unlocks" />
          <MetricTile label="Unlocked" value={`${data.redemptions.length}`} caption="Coupons already in your wallet" />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Offer Grid" title="Available coupons">
        {data.coupons.map((coupon) => {
          const status = couponStatus(coupon);
          const isBusy = busyCouponId === coupon.id;
          const canRedeem = status === "UNLOCKED";
          const canUnlock = status === "AVAILABLE";

          return (
            <View key={coupon.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.copyBlock}>
                  <Text style={styles.title}>{coupon.title}</Text>
                  <Text style={styles.body}>{coupon.description ?? "Student-priced discount for current campaign inventory."}</Text>
                </View>
                <Pill label={status} tone={status === "REDEEMED" ? "success" : status === "UNLOCKED" ? "accent" : "warning"} />
              </View>
              <View style={styles.row}>
                <Pill label={coupon.code} tone="neutral" />
                {coupon.campaign?.title ? <Pill label={coupon.campaign.title} tone="accent" /> : null}
              </View>
              <Text style={styles.meta}>
                {coupon.type === "PERCENTAGE" ? `${coupon.discountValue}% off` : `${coupon.discountValue} off`} • threshold {coupon.unlockThreshold ?? 0} • cost {coupon.rewardCostPoints ?? 0} pts
              </Text>
              {canUnlock ? (
                <PrimaryButton onPress={() => unlock(coupon.id)} disabled={isBusy}>
                  {isBusy ? "Unlocking..." : "Unlock coupon"}
                </PrimaryButton>
              ) : canRedeem ? (
                <PrimaryButton onPress={() => redeem(coupon.id)} disabled={isBusy} variant="secondary">
                  {isBusy ? "Redeeming..." : "Redeem now"}
                </PrimaryButton>
              ) : (
                <PrimaryButton variant="ghost" disabled>
                  Already redeemed
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
