import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { SectionCard } from "./SectionCard";

export function LoadingState({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle} eyebrow="Loading">
      <View style={styles.centered}>
        <ActivityIndicator color="#172033" />
        <Text style={styles.message}>Fetching the latest FitMe data.</Text>
      </View>
    </SectionCard>
  );
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onRetry
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <SectionCard title={title} subtitle={message} eyebrow="Needs Attention">
      <View style={styles.centered}>
        <Text style={styles.message}>The latest state could not be loaded cleanly.</Text>
        {actionLabel && onRetry ? (
          <PrimaryButton onPress={onRetry} variant="secondary" fullWidth={false}>
            {actionLabel}
          </PrimaryButton>
        ) : null}
      </View>
    </SectionCard>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SectionCard title={title} subtitle={message} eyebrow="Empty">
      <View style={styles.centered}>
        <Text style={styles.message}>Nothing has landed here yet, but the flow is ready.</Text>
        {actionLabel && onAction ? (
          <PrimaryButton onPress={onAction} fullWidth={false}>
            {actionLabel}
          </PrimaryButton>
        ) : null}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "flex-start",
    gap: 10
  },
  message: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 21
  }
});
