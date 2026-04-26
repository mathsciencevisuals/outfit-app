import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from './AppHeader';
import { BottomTabBar } from './BottomTabBar';
import { SideDrawer } from './SideDrawer';
import type { TabKey } from './BottomTabBar';

interface Props {
  active: TabKey;
  children: React.ReactNode;
}

/** Wraps a main screen with the shared header, drawer, and tab bar. */
export function AppShell({ active, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={styles.shell}>
      <AppHeader onMenuPress={() => setDrawerOpen(true)} />
      <View style={styles.content}>{children}</View>
      <BottomTabBar active={active} />
      <SideDrawer open={drawerOpen} active={active} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell:   { flex: 1 },
  content: { flex: 1 },
});
