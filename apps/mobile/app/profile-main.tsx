import { View, StyleSheet } from 'react-native';
import { ProfileScreen } from '../src/features/profile/ProfileScreen';
import { BottomTabBar } from '../src/components/BottomTabBar';

export default function ProfileMainPage() {
  return (
    <View style={styles.container}>
      <View style={styles.content}><ProfileScreen /></View>
      <BottomTabBar active="profile" />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { flex: 1 } });
