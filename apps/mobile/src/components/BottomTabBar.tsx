import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight } from '../utils/theme';

export type TabKey = 'discover' | 'tryon' | 'saved' | 'profile';

const TABS: {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}[] = [
  { key: 'discover', icon: 'compass-outline',  iconActive: 'compass',   label: 'Discover', route: '/discover'      },
  { key: 'tryon',    icon: 'shirt-outline',     iconActive: 'shirt',     label: 'Try On',   route: '/tryon-upload'  },
  { key: 'saved',    icon: 'bookmark-outline',  iconActive: 'bookmark',  label: 'Saved',    route: '/saved-looks'   },
  { key: 'profile',  icon: 'person-outline',    iconActive: 'person',    label: 'Profile',  route: '/profile-main'  },
];

export function BottomTabBar({ active }: { active: TabKey }) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => !isActive && router.push(tab.route as never)}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  Colors.border,
    paddingBottom:   24,  // home bar safe area
    paddingTop:      10,
  },
  item: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            3,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  dot: {
    position:    'absolute',
    bottom:      -6,
    width:       4,
    height:      4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
