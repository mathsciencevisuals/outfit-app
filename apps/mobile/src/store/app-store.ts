import { create } from "zustand";

type AppState = {
  userId: string;
  isAuthenticated: boolean;
  lastTryOnRequestId?: string;
  setUserId: (userId: string) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLastTryOnRequestId: (requestId: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  userId: "user-demo",
  isAuthenticated: false,
  lastTryOnRequestId: undefined,
  setUserId: (userId) => set({ userId }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLastTryOnRequestId: (lastTryOnRequestId) => set({ lastTryOnRequestId })
}));
