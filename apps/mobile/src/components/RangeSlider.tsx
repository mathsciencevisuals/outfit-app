import { useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme/design";

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  leftLabel,
  rightLabel
}: {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const safeValue = Math.min(max, Math.max(min, value));
  const percent = (safeValue - min) / (max - min || 1);

  const updateFromEvent = (event: GestureResponderEvent) => {
    const next = min + ((event.nativeEvent.locationX / trackWidth) * (max - min));
    onChange(Math.round(Math.min(max, Math.max(min, next))));
  };

  return (
    <View style={styles.shell}>
      <View
        style={styles.track}
        onLayout={(event: LayoutChangeEvent) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={updateFromEvent}
        onResponderMove={updateFromEvent}
      >
        <View style={[styles.fill, { width: `${percent * 100}%` }]} />
        <View style={[styles.thumb, { left: `${percent * 100}%` }]} />
      </View>
      {(leftLabel || rightLabel) ? (
        <View style={styles.labels}>
          <Text style={styles.label}>{leftLabel}</Text>
          <Text style={styles.label}>{rightLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 8
  },
  track: {
    height: 26,
    justifyContent: "center"
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 10,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent
  },
  thumb: {
    position: "absolute",
    marginLeft: -11,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.inkOnDark,
    borderWidth: 5,
    borderColor: colors.accent
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600"
  }
});
