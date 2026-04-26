import { parseMobileEnv } from "@fitme/config";

export const env = parseMobileEnv({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  EXPO_PUBLIC_DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE ?? "false"
});

export const demoModeEnabled = env.EXPO_PUBLIC_DEMO_MODE === "true";
