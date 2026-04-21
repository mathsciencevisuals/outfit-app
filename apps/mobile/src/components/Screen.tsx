import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf5"
  },
  content: {
    padding: 20,
    gap: 16
  }
});
