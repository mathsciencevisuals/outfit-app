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
        tabBarActiveTintColor: colors.panelStrong,
        tabBarInactiveTintColor: colors.tabMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 4
        },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 78,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: "rgba(229,231,235,0.8)",
          borderRadius: 28,
          backgroundColor: colors.tab
        },
        tabBarIcon: ({ color, focused }) => (
          <Feather
            name={tabIcons[route.name as keyof typeof tabIcons]}
            size={19}
            color={color}
            style={{ opacity: focused ? 1 : 0.88 }}
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
