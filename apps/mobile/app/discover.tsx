import { View, StyleSheet } from 'react-native';
import { DiscoverScreen } from '../src/features/catalog/DiscoverScreen';
import { BottomTabBar } from '../src/components/BottomTabBar';

export default function DiscoverPage() {
  return (
    <View style={styles.container}>
      <View style={styles.content}><DiscoverScreen /></View>
      <BottomTabBar active="discover" />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { flex: 1 } });
