import { Platform } from "react-native";

export const colors = {
  page: "#f6f7fb",
  pageStrong: "#eef2ff",
  panel: "rgba(255,255,255,0.82)",
  panelStrong: "#ffffff",
  panelMuted: "#f8fafc",
  ink: "#151823",
  inkSoft: "#6b7280",
  line: "#e5e7eb",
  lineStrong: "#d6dcff",
  brand: "#6b7280",
  accent: "#6d5efc",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3245d1",
  tab: "rgba(255,255,255,0.82)",
  tabMuted: "#6b7280"
} as const;

export const fonts = {
  display: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "sans-serif"
  }),
  body: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "sans-serif"
  })
};

export const radius = {
  xl: 30,
  lg: 24,
  md: 18,
  pill: 999
} as const;

export const shadow = {
  shadowColor: "#111827",
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 4
} as const;
