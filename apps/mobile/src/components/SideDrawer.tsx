import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/app-store';
import { FontSize, FontWeight, Radius, Spacing } from '../utils/theme';
import type { TabKey } from './BottomTabBar';

const LINKS: { key: TabKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string; badge?: string }[] = [
  { key: 'dashboard',       icon: 'home-outline',      label: 'Dashboard',       route: '/dashboard'      },
  { key: 'tryme',           icon: 'shirt-outline',     label: 'Try-me',          route: '/tryme'          },
  { key: 'recommendations', icon: 'sparkles-outline',  label: 'Recommendations', route: '/recommendations' },
  { key: 'saved',           icon: 'bookmark-outline',  label: 'Saved',           route: '/saved-looks',   },
  { key: 'profile',         icon: 'person-outline',    label: 'Profile',         route: '/profile-main'   },
  { key: 'profile',         icon: 'settings-outline',  label: 'Settings',        route: '/settings'       },
];

interface Props {
  open: boolean;
  active: TabKey;
  onClose: () => void;
}

export function SideDrawer({ open, active, onClose }: Props) {
  const { C }  = useTheme();
  const router = useRouter();
  const savedCount = useAppStore(s => s.savedProductIds.length);
  const slideX = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: open ? 0 : -300,
      useNativeDriver: true,
      tension: 80, friction: 14,
    }).start();
  }, [open]);

  const navigate = (route: string) => {
    onClose();
    router.push(route as never);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { backgroundColor: C.surface, transform: [{ translateX: slideX }] }]}>
        {/* Brand */}
        <View style={[styles.brand, { borderBottomColor: C.border }]}>
          <View style={[styles.brandIcon, { backgroundColor: C.primary }]}>
            <Ionicons name="shirt-outline" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[styles.brandName, { color: C.textPrimary }]}>FITME.AI</Text>
            <Text style={[styles.brandSub,  { color: C.textSecondary }]}>Virtual Stylist</Text>
          </View>
        </View>

        {/* Nav items */}
        <View style={styles.nav}>
          {LINKS.map((link, i) => {
            const isActive = link.key === active && link.route !== '/settings';
            return (
              <Pressable
                key={`${link.route}-${i}`}
                style={[styles.navItem, { backgroundColor: isActive ? C.primaryDim : C.surface2 }]}
                onPress={() => navigate(link.route)}
              >
                <Ionicons name={link.icon} size={20} color={isActive ? C.primary : C.textSecondary} />
                <Text style={[styles.navLabel, { color: isActive ? C.primary : C.textPrimary }]}>
                  {link.label}
                </Text>
                {link.label === 'Saved' && savedCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: C.primary }]}>
                    <Text style={styles.badgeText}>{savedCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: 280, zIndex: 101,
  },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.xl, paddingTop: 56, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  brandSub:  { fontSize: FontSize.xs },
  nav:       { padding: Spacing.md, gap: 4 },
  navItem:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16, borderRadius: Radius.lg },
  navLabel:  { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: FontWeight.bold },
});
