import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../utils/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-100, optional
}

export function LoadingOverlay({ visible, message, progress }: LoadingOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible && opacity._value === 0) return null;

  return (
    <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {progress !== undefined && (
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress}%` }]} />
          </View>
        )}
        {progress !== undefined && (
          <Text style={styles.pct}>{Math.round(progress)}%</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  box: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 200,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  barTrack: {
    width: 160,
    height: 4,
    backgroundColor: Colors.surface3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  pct: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
});
