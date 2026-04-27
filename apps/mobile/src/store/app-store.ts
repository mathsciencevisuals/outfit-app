import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AccentColor = 'teal' | 'purple' | 'blue' | 'pink';
export type ThemeMode  = 'light' | 'dark';

interface AppState {
  userId:            string;
  accessToken:       string | null;
  authEmail:         string | null;
  authPassword:      string | null;
  theme:             ThemeMode;
  accent:            AccentColor;
  savedProductIds:   string[];
  compareProductIds: string[];
  lastTryOnRequestId: string | null;

  setUserId:              (id: string) => void;
  setAccessToken:         (token: string | null) => void;
  setSession:             (session: { userId: string; accessToken: string | null; authEmail?: string | null; authPassword?: string | null }) => void;
  setTheme:               (t: ThemeMode) => void;
  setAccent:              (a: AccentColor) => void;
  toggleSavedProduct:     (id: string) => void;
  addToCompare:           (id: string) => void;
  removeFromCompare:      (id: string) => void;
  clearCompare:           () => void;
  setLastTryOnRequestId:  (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId:             'user-demo',
      accessToken:        null,
      authEmail:          null,
      authPassword:       null,
      theme:              'light',
      accent:             'teal',
      savedProductIds:    [],
      compareProductIds:  [],
      lastTryOnRequestId: null,

      setUserId:  (id)  => set({ userId: id }),
      setAccessToken: (token) => set({ accessToken: token }),
      setSession: ({ userId, accessToken, authEmail, authPassword }) =>
        set((state) => ({
          userId,
          accessToken,
          authEmail: authEmail ?? state.authEmail,
          authPassword: authPassword ?? state.authPassword,
        })),
      setTheme:   (t)   => set({ theme: t }),
      setAccent:  (a)   => set({ accent: a }),

      toggleSavedProduct: (id) => {
        const ids = get().savedProductIds;
        set({ savedProductIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
      },

      addToCompare: (id) => {
        const ids = get().compareProductIds;
        if (ids.length < 3 && !ids.includes(id)) set({ compareProductIds: [...ids, id] });
      },

      removeFromCompare: (id) =>
        set({ compareProductIds: get().compareProductIds.filter(x => x !== id) }),

      clearCompare: () => set({ compareProductIds: [] }),

      setLastTryOnRequestId: (id) => set({ lastTryOnRequestId: id }),
    }),
    {
      name:    'fitme-store',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: false,
    },
  ),
);
