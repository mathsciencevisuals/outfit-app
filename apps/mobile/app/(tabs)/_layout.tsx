import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors } from "../../src/theme/design";

const tabIcons = {
  feed: "home",
  "try-on": "camera",
  saved: "heart",
  retail: "shopping-bag",
  account: "user"
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          marginBottom: 3
        },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 76,
          paddingTop: 9,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: colors.lineDark,
          borderRadius: 28,
          backgroundColor: colors.tab,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 26,
          elevation: 12
        },
        tabBarIcon: ({ color, focused }) => (
          <Feather
            name={tabIcons[route.name as keyof typeof tabIcons]}
            size={18}
            color={color}
            style={{ opacity: focused ? 1 : 0.9 }}
          />
        ),
        sceneContainerStyle: {
          backgroundColor: colors.page
        }
      })}
    >
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="try-on" options={{ title: "Try-On" }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
      <Tabs.Screen name="retail" options={{ title: "Shops" }} />
      <Tabs.Screen name="account" options={{ title: "Profile" }} />
    </Tabs>
  );
}
