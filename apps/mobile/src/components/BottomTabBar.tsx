import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, FontWeight } from '../utils/theme';

export type TabKey = 'dashboard' | 'tryme' | 'recommendations' | 'saved' | 'profile';

const TABS: {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}[] = [
  { key: 'dashboard',       icon: 'home-outline',      iconActive: 'home',       label: 'Home',    route: '/dashboard'       },
  { key: 'tryme',           icon: 'shirt-outline',      iconActive: 'shirt',      label: 'Try-me',  route: '/tryme'           },
  { key: 'recommendations', icon: 'sparkles-outline',   iconActive: 'sparkles',   label: 'For You', route: '/recommendations'  },
  { key: 'saved',           icon: 'bookmark-outline',   iconActive: 'bookmark',   label: 'Saved',   route: '/saved-looks'     },
  { key: 'profile',         icon: 'person-outline',     iconActive: 'person',     label: 'Profile', route: '/profile-main'    },
];

export function BottomTabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const { C }  = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => !isActive && router.push(tab.route as never)}
          >
            {isActive && <View style={[styles.indicator, { backgroundColor: C.primary }]} />}
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={22}
              color={isActive ? C.primary : C.textMuted}
            />
            <Text style={[styles.label, { color: isActive ? C.primary : C.textMuted },
              isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24, paddingTop: 8,
  },
  item: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative',
  },
  indicator: {
    position: 'absolute', top: -8, width: 40, height: 3, borderRadius: 2,
  },
  label:       { fontSize: FontSize.xs },
  labelActive: { fontWeight: FontWeight.semibold },
});
