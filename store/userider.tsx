import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Adapter to make expo-secure-store work with Zustand persist
export const secureStorage = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key);
    return value ?? null;
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

type PartnerState = {
  appliedForRider: boolean;
  setAppliedForRider: (value: boolean) => void;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
};

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set) => ({
      appliedForRider: false,
      setAppliedForRider: (value) => set({ appliedForRider: value }),
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "rider-store", // key used in SecureStore
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ appliedForRider: state.appliedForRider }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
