/**
 * Runtime environment config.
 *
 * EXPO_PUBLIC_* variables are inlined at build time by Expo.
 * They must be set in one of:
 *   - .env.local             (local dev)
 *   - eas.json → build → env (EAS builds)
 *   - Railway Variables tab  (Railway deployments)
 *
 * Do NOT put secrets here — these values are bundled into the app binary.
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

if (__DEV__ && apiUrl === 'http://localhost:3001') {
  console.warn(
    '[FitMe] EXPO_PUBLIC_API_URL is not set.\n' +
    'Copy .env.example → .env.local and set your API URL, or\n' +
    'set it in eas.json → build → env for EAS builds.'
  );
}

if (!__DEV__ && apiUrl.includes('YOUR_RAILWAY')) {
  throw new Error(
    '[FitMe] EXPO_PUBLIC_API_URL still contains placeholder value.\n' +
    'Set the real Railway URL in eas.json → build → env before building.'
  );
}

export const env = {
  EXPO_PUBLIC_API_URL: apiUrl,
} as const;
