import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SessionUser, UserProfile, UserRole } from "../types/api";

const STORAGE_KEY = "fitme-app-store";

type AppState = {
  userId: string;
  userRole: UserRole | null;
  token: string | null;
  profile: UserProfile | null;
  profileVersion: number;
  isAuthenticated: boolean;
  authChecked: boolean;
  lastTryOnRequestId?: string;
  setSession: (input: { token: string; user: SessionUser }) => void;
  setProfile: (profile: UserProfile | null) => void;
  finishAuthCheck: () => void;
  setLastTryOnRequestId: (requestId?: string) => void;
  resetSession: () => void;
  logout: () => Promise<void>;
};

const initialState = {
  userId: "",
  userRole: null as UserRole | null,
  token: null as string | null,
  profile: null as UserProfile | null,
  profileVersion: 0,
  isAuthenticated: false,
  authChecked: false,
  lastTryOnRequestId: undefined as string | undefined
};

function mergeProfile(current: UserProfile | null, next: UserProfile | null) {
  if (!next) {
    return null;
  }
  if (!current) {
    return next;
  }

  return {
    ...current,
    ...next,
    measurements: next.measurements ?? current.measurements ?? [],
    savedLooks: next.savedLooks ?? current.savedLooks ?? [],
    preferredColors: next.preferredColors ?? current.preferredColors ?? [],
    avoidedColors: next.avoidedColors ?? current.avoidedColors ?? []
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: ({ token, user }) =>
        set((state) => ({
          token,
          userId: user.id,
          userRole: user.role,
          profile: mergeProfile(state.profile, user.profile ?? null),
          profileVersion: state.profileVersion + 1,
          isAuthenticated: true,
          authChecked: true
        })),
      setProfile: (profile) =>
        set((state) => ({
          profile: mergeProfile(state.profile, profile),
          profileVersion: state.profileVersion + 1,
          isAuthenticated: state.token != null ? true : state.isAuthenticated
        })),
      finishAuthCheck: () => set({ authChecked: true }),
      setLastTryOnRequestId: (lastTryOnRequestId) => set({ lastTryOnRequestId }),
      resetSession: () =>
        set({
          ...initialState,
          authChecked: true
        }),
      logout: async () => {
        set({
          ...initialState,
          authChecked: true
        });
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        userRole: state.userRole,
        token: state.token,
        profile: state.profile,
        profileVersion: state.profileVersion,
        isAuthenticated: state.isAuthenticated,
        lastTryOnRequestId: state.lastTryOnRequestId
      })
    }
  )
);
