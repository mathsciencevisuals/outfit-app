import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../utils/theme';

export interface ScreenProps {
  scrollable?: boolean;
  /** alias for scrollable, used by some older screens */
  scroll?: boolean;
  noPadding?: boolean;
  /** 'dark' gives onboarding screens a deep navy background */
  tone?: 'light' | 'dark';
  /** accepted but unused — profile strip lives in AppShell */
  showProfileStrip?: boolean;
}

const DARK_BG = '#0d0f1a';

export function Screen({
  children,
  scrollable,
  scroll,
  noPadding = false,
  tone = 'light',
}: PropsWithChildren<ScreenProps>) {
  const isScrollable = scrollable ?? scroll ?? true;
  const bg = tone === 'dark' ? DARK_BG : Colors.bg;

  const inner = (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, noPadding && styles.noPadding]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, noPadding && styles.noPadding]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  kav:       { flex: 1 },
  fill:      { flex: 1, padding: Spacing.base },
  content:   { padding: Spacing.base, gap: Spacing.base },
  noPadding: { padding: 0 },
});
