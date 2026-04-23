import { Pressable, StyleSheet, Text, View } from "react-native";

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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#efe4d3",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "#dfceb5"
  },
  option: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center"
  },
  optionActive: {
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: "#e5d7c0"
  },
  pressed: {
    opacity: 0.94
  },
  label: {
    color: "#6c5a44",
    fontSize: 13,
    fontWeight: "700"
  },
  labelActive: {
    color: "#182033"
  }
});
