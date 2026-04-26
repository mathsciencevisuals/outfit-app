import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';
import type { SavedLook } from '../../types';

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.savedLooks(userId),
    [userId]
  );
  const looks: SavedLook[] = Array.isArray(data) ? data : [];

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Couldn't load saved looks" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionCard
        title="Saved looks"
        subtitle="Outfits you can revisit after try-on and shop comparison."
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading saved looks…</Text>
        ) : looks.length === 0 ? (
          <EmptyState
            icon="💾"
            title="No saved looks yet"
            subtitle="After a try-on, tap 'Save this look' to store your favourite outfits here."
            action="Start a try-on"
            onAction={() => router.push('/tryon-upload')}
          />
        ) : (
          looks.map((look) => (
            <TouchableOpacity
              key={look.id}
              style={styles.lookCard}
              onPress={() => {/* navigate to look detail */}}
              activeOpacity={0.8}
            >
              {look.tryOnImageUrl ? (
                <Image
                  source={{ uri: look.tryOnImageUrl }}
                  style={styles.lookImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.lookImage, styles.lookImagePlaceholder]}>
                  <Text style={styles.placeholderIcon}>👕</Text>
                </View>
              )}
              <View style={styles.lookInfo}>
                <Text style={styles.lookName}>{look.name}</Text>
                {look.note ? (
                  <Text style={styles.lookNote} numberOfLines={2}>{look.note}</Text>
                ) : null}
                <Text style={styles.lookDate}>
                  {new Date(look.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', padding: Spacing.lg,
  },
  lookCard: {
    flexDirection: 'row', gap: Spacing.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  lookImage: {
    width: 72, height: 90, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
  },
  lookImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 28 },
  lookInfo: { flex: 1, gap: 3 },
  lookName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  lookNote: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  lookDate: { fontSize: FontSize.xs, color: Colors.textMuted },
});
