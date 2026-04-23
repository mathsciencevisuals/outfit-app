import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme/design";

export function SegmentedControl({
  options,
  selected,
  onSelect
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable key={option} onPress={() => onSelect(option)} style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}>
              <Text style={[styles.label, active && styles.labelActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: 2
  },
  container: {
    flexDirection: "row",
    backgroundColor: colors.pageStrong,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  option: {
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center"
  },
  optionActive: {
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line
  },
  pressed: {
    opacity: 0.94
  },
  label: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: colors.ink
  }
});
