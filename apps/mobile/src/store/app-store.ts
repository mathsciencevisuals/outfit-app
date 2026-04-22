import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SessionUser, UserRole } from "../types/api";

type AppState = {
  userId: string;
  userRole: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  lastTryOnRequestId?: string;
  setSession: (input: { token: string; user: SessionUser }) => void;
  finishAuthCheck: () => void;
  setLastTryOnRequestId: (requestId: string) => void;
  logout: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: "",
      userRole: null,
      token: null,
      isAuthenticated: false,
      authChecked: false,
      lastTryOnRequestId: undefined,
      setSession: ({ token, user }) =>
        set({
          token,
          userId: user.id,
          userRole: user.role,
          isAuthenticated: true,
          authChecked: true
        }),
      finishAuthCheck: () => set({ authChecked: true }),
      setLastTryOnRequestId: (lastTryOnRequestId) => set({ lastTryOnRequestId }),
      logout: () =>
        set({
          userId: "",
          userRole: null,
          token: null,
          isAuthenticated: false,
          authChecked: true,
          lastTryOnRequestId: undefined
        })
    }),
    {
      name: "fitme-app-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        userRole: state.userRole,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastTryOnRequestId: state.lastTryOnRequestId
      })
    }
  )
);
