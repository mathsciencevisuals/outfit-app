import { Platform } from "react-native";

export const colors = {
  page: "#0b0b13",
  pageStrong: "#111423",
  pageMuted: "#171b2d",
  panel: "rgba(19,21,34,0.76)",
  panelStrong: "rgba(24,27,43,0.92)",
  panelMuted: "rgba(34,38,58,0.88)",
  panelDark: "#131523",
  panelDarkStrong: "#090b14",
  glass: "rgba(255,255,255,0.08)",
  glassStrong: "rgba(255,255,255,0.14)",
  ink: "#eef2ff",
  inkSoft: "rgba(227,232,255,0.76)",
  inkMuted: "rgba(190,198,228,0.68)",
  inkOnDark: "#f8faff",
  inkOnDarkSoft: "rgba(248,250,255,0.76)",
  line: "rgba(158,168,214,0.16)",
  lineStrong: "rgba(171,182,234,0.28)",
  lineDark: "rgba(255,255,255,0.1)",
  brand: "#a9b1da",
  accent: "#7c3aed",
  accentSoft: "rgba(124,58,237,0.16)",
  accentStrong: "#6d28d9",
  success: "#1aa36f",
  successSoft: "rgba(26,163,111,0.16)",
  warning: "#d98b19",
  warningSoft: "rgba(217,139,25,0.16)",
  danger: "#d55b67",
  dangerSoft: "rgba(213,91,103,0.16)",
  info: "#2f6df6",
  infoSoft: "rgba(47,109,246,0.16)",
  heroStart: "#0b0b13",
  heroEnd: "#241538",
  heroAccent: "#472b7c",
  heroGlow: "rgba(124,58,237,0.34)",
  tab: "rgba(19,21,34,0.92)",
  tabMuted: "#8e95bb",
  shadow: "#0f1525"
} as const;

export const fonts = {
  display: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "serif"
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
  sm: 14,
  pill: 999
} as const;

export const shadow = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.12,
  shadowRadius: 28,
  elevation: 8
} as const;
