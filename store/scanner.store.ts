import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ScanMode = "regular" | "add-to-cart";

export type ScanHistoryItem = {
  barcode: string;
  timestamp: number;
  status: "success" | "error";
  productName?: string;
};

interface ScannerState {
  // Hydration state
  isHydrated: boolean;

  // Pairing
  sessionId: string | null;
  serverUrl: string | null;
  scannerToken: string | null;

  // Connection
  status: ConnectionStatus;

  // Scan mode
  scanMode: ScanMode;

  // Audio preference
  audioEnabled: boolean;

  // Scan history & counter
  scanCount: number;
  scanHistory: ScanHistoryItem[];

  // Last ack from server
  lastAck: { productName: string; qty: number } | null;

  // Actions
  setPairing: (
    sessionId: string,
    serverUrl: string,
    scannerToken: string,
  ) => void;
  setStatus: (s: ConnectionStatus) => void;
  setScanMode: (mode: ScanMode) => void;
  setAudioEnabled: (enabled: boolean) => void;
  addScanHistory: (item: ScanHistoryItem) => void;
  clearScanHistory: () => void;
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
      scanMode: "regular",
      audioEnabled: true,
      scanCount: 0,
      scanHistory: [],
      lastAck: null,

      setPairing: (sessionId, serverUrl, scannerToken) => {
        set({ sessionId, serverUrl, scannerToken });
      },

      setStatus: (status) => set({ status }),
      setScanMode: (scanMode) => set({ scanMode }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),

      addScanHistory: (item) => {
        const { scanHistory, scanCount } = get();
        const newHistory = [item, ...scanHistory].slice(0, 20); // keep last 20
        set({ scanHistory: newHistory, scanCount: scanCount + 1 });
      },

      clearScanHistory: () => {
        set({ scanHistory: [], scanCount: 0 });
      },

      setLastAck: (lastAck) => set({ lastAck }),

      clearPairing: () => {
        set({
          sessionId: null,
          serverUrl: null,
          scannerToken: null,
          status: "disconnected",
          lastAck: null,
          scanHistory: [],
          scanCount: 0,
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
