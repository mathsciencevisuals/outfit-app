import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppState = {
  userId: string;
  token: string | null;
  isAuthenticated: boolean;
  lastTryOnRequestId?: string;
  setUserId: (userId: string) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLastTryOnRequestId: (requestId: string) => void;
  logout: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: "",
      token: null,
      isAuthenticated: false,
      lastTryOnRequestId: undefined,
      setUserId: (userId) => set({ userId }),
      setToken: (token) => set({ token }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLastTryOnRequestId: (lastTryOnRequestId) => set({ lastTryOnRequestId }),
      logout: () => set({ userId: "", token: null, isAuthenticated: false })
    }),
    {
      name: "fitme-app-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
