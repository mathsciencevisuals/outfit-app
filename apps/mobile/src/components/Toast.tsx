import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, FontSize, FontWeight, Spacing } from '../utils/theme';

interface Props { message: string; visible: boolean; }

export function Toast({ message, visible }: Props) {
  const { C } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 80, friction: 10,
    }).start();
  }, [visible]);

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: C.primary, opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [40, 0] }) }] },
    ]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 96, alignSelf: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.full, zIndex: 999,
  },
  text: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
