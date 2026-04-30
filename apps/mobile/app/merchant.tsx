import { View, StyleSheet } from 'react-native';
import { MerchantPortalScreen } from '../src/features/merchant/MerchantPortalScreen';
import { BottomTabBar } from '../src/components/BottomTabBar';

export default function MerchantPage() {
  return (
    <View style={styles.container}>
      <View style={styles.content}><MerchantPortalScreen /></View>
      <BottomTabBar active="profile" />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { flex: 1 } });
