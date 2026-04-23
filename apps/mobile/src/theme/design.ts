import { Platform } from "react-native";

export const colors = {
  page: "#f4f6fb",
  pageStrong: "#ebeffa",
  pageMuted: "#d9def1",
  panel: "rgba(255,255,255,0.84)",
  panelStrong: "#ffffff",
  panelMuted: "#f7f9ff",
  panelDark: "#131826",
  panelDarkStrong: "#0d1220",
  glass: "rgba(255,255,255,0.14)",
  glassStrong: "rgba(255,255,255,0.22)",
  ink: "#121728",
  inkSoft: "#69718a",
  inkMuted: "#8f97ad",
  inkOnDark: "#f5f7ff",
  inkOnDarkSoft: "rgba(245,247,255,0.76)",
  line: "rgba(104,117,156,0.16)",
  lineStrong: "rgba(96,112,166,0.28)",
  lineDark: "rgba(255,255,255,0.08)",
  brand: "#67708c",
  accent: "#635bff",
  accentSoft: "#eef0ff",
  accentStrong: "#4739ff",
  success: "#1aa36f",
  successSoft: "#e6f8f0",
  warning: "#d98b19",
  warningSoft: "#fff3de",
  danger: "#d55b67",
  dangerSoft: "#feecef",
  info: "#2f6df6",
  infoSoft: "#e9f0ff",
  heroStart: "#101625",
  heroEnd: "#261f4b",
  heroAccent: "#3a2d7d",
  heroGlow: "rgba(129,113,255,0.42)",
  tab: "rgba(253,254,255,0.92)",
  tabMuted: "#8a92a9",
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
