import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface ScannerState {
  // Hydration state
  isHydrated: boolean;

  // Pairing
  sessionId: string | null;
  serverUrl: string | null;
  scannerToken: string | null;

  // Connection
  status: ConnectionStatus;

  // Last ack from server
  lastAck: { productName: string; qty: number } | null;

  // Actions
  setPairing: (
    sessionId: string,
    serverUrl: string,
    scannerToken: string,
  ) => void;
  setStatus: (s: ConnectionStatus) => void;
  setLastAck: (ack: { productName: string; qty: number } | null) => void;
  clearPairing: () => void;
  setHasHydrated: (state: boolean) => void;
}

const STORAGE_KEY = "ann_scanner_pairing";

export const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      isHydrated: false,
      sessionId: null,
      serverUrl: null,
      scannerToken: null,
      status: "disconnected",
      lastAck: null,

      setPairing: (sessionId, serverUrl, scannerToken) => {
        set({ sessionId, serverUrl, scannerToken });
      },

      setStatus: (status) => set({ status }),
      setLastAck: (lastAck) => set({ lastAck }),

      clearPairing: () => {
        set({
          sessionId: null,
          serverUrl: null,
          scannerToken: null,
          status: "disconnected",
          lastAck: null,
        });
      },

      setHasHydrated: (state) => {
        set({ isHydrated: state });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
