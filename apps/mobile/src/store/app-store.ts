import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, ProductVariant, TryOnStatus } from '../types';

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

  // Try-on session state (not persisted — file URIs become stale between sessions)
  capturedPhotoUri:  string | undefined;
  selectedVariant:   ProductVariant | undefined;
  selectedProduct:   Product | undefined;
  tryOnStatus:       TryOnStatus;
  tryOnProgress:     number;
  tryOnError:        string | null;

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
  setCapturedPhoto:       (uri: string | undefined) => void;
  selectVariant:          (variant: ProductVariant, product: Product) => void;
  setTryOnStatus:         (s: TryOnStatus) => void;
  setTryOnProgress:       (p: number) => void;
  setTryOnError:          (e: string | null) => void;
  resetTryOn:             () => void;
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
      capturedPhotoUri:   undefined,
      selectedVariant:    undefined,
      selectedProduct:    undefined,
      tryOnStatus:        'idle',
      tryOnProgress:      0,
      tryOnError:         null,

      setUserId:  (id)  => set({ userId: id }),
      setAccessToken: (token) => set({ accessToken: token }),
      setSession: ({ userId, accessToken, authEmail, authPassword }) =>
        set((state) => ({
          userId,
          accessToken,
          authEmail:    authEmail    ?? state.authEmail,
          authPassword: authPassword ?? state.authPassword,
        })),
      setTheme:   (t) => set({ theme: t }),
      setAccent:  (a) => set({ accent: a }),

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
      setCapturedPhoto:  (uri)           => set({ capturedPhotoUri: uri }),
      selectVariant:     (variant, product) => set({ selectedVariant: variant, selectedProduct: product }),
      setTryOnStatus:    (s)             => set({ tryOnStatus: s }),
      setTryOnProgress:  (p)             => set({ tryOnProgress: p }),
      setTryOnError:     (e)             => set({ tryOnError: e }),
      resetTryOn: () => set({
        capturedPhotoUri: undefined,
        selectedVariant:  undefined,
        selectedProduct:  undefined,
        tryOnStatus:      'idle',
        tryOnProgress:    0,
        tryOnError:       null,
      }),
    }),
    {
      name:    'fitme-store',
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: false,
      partialize: (state) => ({
        userId:             state.userId,
        accessToken:        state.accessToken,
        authEmail:          state.authEmail,
        authPassword:       state.authPassword,
        theme:              state.theme,
        accent:             state.accent,
        savedProductIds:    state.savedProductIds,
        compareProductIds:  state.compareProductIds,
        lastTryOnRequestId: state.lastTryOnRequestId,
      }),
    },
  ),
);
