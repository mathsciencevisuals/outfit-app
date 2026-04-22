import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SessionUser, UserProfile, UserRole } from "../types/api";

type AppState = {
  userId: string;
  userRole: UserRole | null;
  token: string | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  lastTryOnRequestId?: string;
  setSession: (input: { token: string; user: SessionUser }) => void;
  setProfile: (profile: UserProfile | null) => void;
  finishAuthCheck: () => void;
  setLastTryOnRequestId: (requestId: string) => void;
  logout: () => Promise<void>;
};

const initialState = {
  userId: "",
  userRole: null as UserRole | null,
  token: null as string | null,
  profile: null as UserProfile | null,
  isAuthenticated: false,
  authChecked: false,
  lastTryOnRequestId: undefined as string | undefined
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: ({ token, user }) =>
        set({
          token,
          userId: user.id,
          userRole: user.role,
          profile: user.profile ?? null,
          isAuthenticated: true,
          authChecked: true
        }),
      setProfile: (profile) => set({ profile }),
      finishAuthCheck: () => set({ authChecked: true }),
      setLastTryOnRequestId: (lastTryOnRequestId) => set({ lastTryOnRequestId }),
      logout: async () => {
        set({
          ...initialState,
          authChecked: true
        });
        await AsyncStorage.removeItem("fitme-app-store");
      }
    }),
    {
      name: "fitme-app-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        userRole: state.userRole,
        token: state.token,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        lastTryOnRequestId: state.lastTryOnRequestId
      })
    }
  )
);
