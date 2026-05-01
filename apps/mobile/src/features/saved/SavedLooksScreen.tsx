import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const localPreviews = useAppStore((s) => s.localSavedLookPreviews);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.savedLooks(userId),
    [userId]
  );
  const looks: SavedLook[] = Array.isArray(data) ? data : [];

  const handleDeleteLook = (look: SavedLook) => {
    Alert.alert('Delete saved look?', `Remove "${look.name}" from your saved list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.deleteSavedLook(look.id);
            refetch();
          } catch (deleteError) {
            Alert.alert(
              'Delete failed',
              deleteError instanceof Error ? deleteError.message : 'Please try again.'
            );
          }
        },
      },
    ]);
  };

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
          looks.map((look) => {
            const localPreviewUri = localPreviews[look.id]?.imageUri;
            const products = look.products ?? look.items?.map((item) => item.product).filter(Boolean) ?? [];
            const previewUri = localPreviewUri ?? look.tryOnImageUrl ?? products[0]?.variants[0]?.imageUrl;

            return (
              <TouchableOpacity
                key={look.id}
                style={styles.lookCard}
                onPress={() => {/* navigate to look detail */}}
                activeOpacity={0.8}
              >
                <View style={styles.lookImageWrap}>
                  {previewUri ? (
                    <Image
                      source={{ uri: previewUri }}
                      style={styles.lookImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.lookImage, styles.lookImagePlaceholder]}>
                      <Ionicons name="shirt-outline" size={30} color={Colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.lookImageBadge}>
                    <Ionicons name="bookmark" size={11} color={Colors.white} />
                  </View>
                </View>
                <View style={styles.lookInfo}>
                  <Text style={styles.lookName}>{look.name}</Text>
                  {look.note ? (
                    <Text style={styles.lookNote} numberOfLines={2}>{look.note}</Text>
                  ) : null}
                  <Text style={styles.lookDate}>
                    {new Date(look.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleDeleteLook(look);
                  }}
                  accessibilityLabel={`Delete ${look.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </Pressable>
              </TouchableOpacity>
            );
          })
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
  lookImageWrap: {
    position: 'relative',
  },
  lookImage: {
    width: 72, height: 90, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
  },
  lookImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lookImageBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  lookInfo: { flex: 1, gap: 3 },
  lookName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  lookNote: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  lookDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorDim,
  },
});
