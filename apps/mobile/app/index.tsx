// Index is handled by NavigationGuard in _layout.tsx.
// This file must exist for expo-router to register the route,
// but it renders nothing — the guard redirects immediately.
import { View } from 'react-native';
export default function IndexRoute() {
  return <View />;
}
