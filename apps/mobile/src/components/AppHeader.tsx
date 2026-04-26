import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated, Image, Modal, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { mobileApi } from '../services/api';
import { useAppStore } from '../store/app-store';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';

interface Props {
  title?: string;
  onMenuPress?: () => void;
}

export function AppHeader({ title = 'FITME.AI', onMenuPress }: Props) {
  const { C }  = useTheme();
  const router = useRouter();
  const userId = useAppStore(s => s.userId);
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [dropOpen,   setDropOpen]   = useState(false);

  const handleChangePhoto = async () => {
    setDropOpen(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileUri(uri);
      mobileApi.uploadProfilePhoto(userId, uri).catch(() => {});
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }, Shadow.sm]}>
      {/* Hamburger */}
      <Pressable style={styles.iconBtn} onPress={onMenuPress} hitSlop={8}>
        <Ionicons name="menu-outline" size={26} color={C.textPrimary} />
      </Pressable>

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={[styles.logoIcon, { backgroundColor: C.primary }]}>
          <Ionicons name="shirt-outline" size={16} color="#fff" />
        </View>
        <Text style={[styles.logoText, { color: C.textPrimary }]}>{title}</Text>
      </View>

      {/* Profile avatar + dropdown */}
      <View>
        <Pressable onPress={() => setDropOpen(v => !v)}>
          <Image
            source={{ uri: profileUri ?? `https://i.pravatar.cc/100?img=5` }}
            style={[styles.avatar, { borderColor: C.primary }]}
          />
        </Pressable>

        {dropOpen && (
          <View style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.border }, Shadow.md]}>
            <View style={[styles.dropHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.dropName, { color: C.textPrimary }]}>Alex Morgan</Text>
              <Text style={[styles.dropEmail, { color: C.textSecondary }]}>alex@fitme.ai</Text>
            </View>
            <Pressable style={[styles.dropItem, { backgroundColor: C.surface2 }]} onPress={handleChangePhoto}>
              <Ionicons name="camera-outline" size={16} color={C.textSecondary} />
              <Text style={[styles.dropItemText, { color: C.textPrimary }]}>Change Photo</Text>
            </Pressable>
            <Pressable style={[styles.dropItem, { backgroundColor: C.surface2 }]}
              onPress={() => { setDropOpen(false); router.push('/settings' as never); }}>
              <Ionicons name="settings-outline" size={16} color={C.textSecondary} />
              <Text style={[styles.dropItemText, { color: C.textPrimary }]}>Settings</Text>
            </Pressable>
            <Pressable style={[styles.dropItem, { backgroundColor: C.surface2 }]}
              onPress={() => setDropOpen(false)}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
              <Text style={[styles.dropItemText, { color: '#ef4444' }]}>Logout</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn:  { padding: 4 },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  avatar:   { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  dropdown: {
    position: 'absolute', right: 0, top: 44, width: 220,
    borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', zIndex: 999,
  },
  dropHeader: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  dropName:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  dropEmail:  { fontSize: FontSize.xs, marginTop: 2 },
  dropItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  dropItemText: { fontSize: FontSize.sm },
});
