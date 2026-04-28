import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View,
} from 'react-native';

import { ONBOARDED_KEY } from '../../../app/_layout';
import { EmptyState }    from '../../components/EmptyState';
import { InfoRow }       from '../../components/InfoRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { useAppStore }   from '../../store/app-store';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';

interface ProfileScreenProps {
  mode?: 'onboarding' | 'main';
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

export function ProfileScreen({ mode = 'onboarding' }: ProfileScreenProps) {
  const router = useRouter();
  const userId = useAppStore((s) => s.userId);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data, loading, error, refetch } = useAsyncResource(
    () => mobileApi.profile(userId),
    [userId],
  );

  // ── Avatar upload ────────────────────────────────────────────────────────────

  const uploadAvatar = useCallback(async (uri: string) => {
    setUploadingAvatar(true);
    try {
      await mobileApi.uploadProfilePhoto(userId, uri);
      refetch();
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [userId, refetch]);

  const handleCameraAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) uploadAvatar(result.assets[0].uri);
  }, [uploadAvatar]);

  const handleGalleryAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Gallery permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) uploadAvatar(result.assets[0].uri);
  }, [uploadAvatar]);

  const handleChangeAvatar = useCallback(() => {
    Alert.alert('Change Photo', undefined, [
      { text: 'Take Photo',          onPress: handleCameraAvatar },
      { text: 'Choose from Library', onPress: handleGalleryAvatar },
      { text: 'Cancel',              style: 'cancel' },
    ]);
  }, [handleCameraAvatar, handleGalleryAvatar]);

  // ── Logout ───────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          useAppStore.getState().setAccessToken(null);
          router.replace('/auth');
        },
      },
    ]);
  }, [router]);

  // ── Onboarding continue ──────────────────────────────────────────────────────

  const handleContinue = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    router.push('/measurements');
  }, [router]);

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen>
        <SectionCard>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Couldn't load profile"
          subtitle={error}
          action="Retry"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const fullName = data
    ? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'User'
    : 'User';

  // ── Main profile ─────────────────────────────────────────────────────────────

  if (mode === 'main') {
    return (
      <Screen>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handleChangeAvatar} style={styles.avatarWrap}>
            {uploadingAvatar ? (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : data?.avatarUrl ? (
              <Image source={{ uri: data.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.profileName}>{fullName}</Text>
          {data?.email ? <Text style={styles.profileEmail}>{data.email}</Text> : null}
        </View>

        {/* Account navigation */}
        <SectionCard>
          <Pressable style={styles.navRow} onPress={() => router.push('/measurements')}>
            <View style={styles.navIconBox}>
              <Ionicons name="body-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Measurements</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => router.push('/style-preferences')}>
            <View style={styles.navIconBox}>
              <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Style Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => router.push('/saved-looks')}>
            <View style={styles.navIconBox}>
              <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Saved Looks</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
          <View style={styles.navDivider} />
          <Pressable style={styles.navRow} onPress={() => router.push('/settings')}>
            <View style={styles.navIconBox}>
              <Ionicons name="settings-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </SectionCard>

        {/* Profile details */}
        <SectionCard title="Profile details">
          <InfoRow label="Height"     value={data?.heightCm ? `${data.heightCm} cm` : '—'} />
          <InfoRow label="Body shape" value={data?.bodyShape ?? '—'} />
          <InfoRow
            label="Palette"
            value={(data?.preferredColors ?? []).join(', ') || '—'}
            last
          />
        </SectionCard>

        {/* Logout */}
        <PrimaryButton variant="danger" onPress={handleLogout}>
          Log out
        </PrimaryButton>
      </Screen>
    );
  }

  // ── Onboarding mode ──────────────────────────────────────────────────────────

  return (
    <Screen>
      <SectionCard
        title="Your profile"
        subtitle="Foundational details that power fit and style recommendations."
      >
        <InfoRow label="Name"       value={fullName} />
        <InfoRow label="Height"     value={data?.heightCm ? `${data.heightCm} cm` : '—'} />
        <InfoRow label="Body shape" value={data?.bodyShape ?? '—'} />
        <InfoRow
          label="Palette"
          value={(data?.preferredColors ?? []).join(', ') || '—'}
          last
        />
      </SectionCard>

      <View style={styles.actions}>
        <PrimaryButton onPress={handleContinue}>
          Continue to measurements →
        </PrimaryButton>
        <PrimaryButton
          variant="secondary"
          onPress={() => {
            AsyncStorage.setItem(ONBOARDED_KEY, 'true');
            router.replace('/discover');
          }}
        >
          Skip to discover
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarWrap:    { position: 'relative' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    ...Shadow.md,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  navIconBox: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  navDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 36 + Spacing.md,
  },

  actions: { gap: Spacing.sm },
});
