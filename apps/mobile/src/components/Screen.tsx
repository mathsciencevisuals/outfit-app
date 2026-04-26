import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../utils/theme';

interface ScreenProps {
  /** Disable scroll for full-screen camera/result views */
  scrollable?: boolean;
  noPadding?: boolean;
}

/**
 * Root screen wrapper.
 * - SafeAreaView on all edges (handles notch + home bar on both platforms)
 * - KeyboardAvoidingView so inputs don't get hidden
 * - ScrollView (opt-out with scrollable=false)
 */
export function Screen({ children, scrollable = true, noPadding = false }: PropsWithChildren<ScreenProps>) {
  const inner = (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {scrollable ? (
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.bg },
  kav:      { flex: 1 },
  fill:     { flex: 1, padding: Spacing.base },
  content:  { padding: Spacing.base, gap: Spacing.base },
  noPadding:{ padding: 0 },
});
