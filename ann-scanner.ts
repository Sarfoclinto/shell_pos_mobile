/**
 * ANN Scanner — Expo Mobile App
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dependencies to install:
 *   npx expo install expo-camera expo-barcode-scanner expo-haptics
 *   npm install socket.io-client @react-native-async-storage/async-storage
 *   npx expo install expo-status-bar expo-linear-gradient
 *
 * File structure:
 *   ann-scanner/
 *   ├── app.json
 *   ├── App.tsx          ← this file
 *   ├── src/
 *   │   ├── screens/
 *   │   │   ├── HomeScreen.tsx
 *   │   │   ├── PairScreen.tsx
 *   │   │   └── ScanScreen.tsx
 *   │   ├── store/
 *   │   │   └── scanner.store.ts
 *   │   └── hooks/
 *   │       └── useSocket.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── App.tsx ──────────────────────────────────────────────────────────────────
/*
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import PairScreen from "./src/screens/PairScreen";
import ScanScreen from "./src/screens/ScanScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Pair" component={PairScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
*/

// ══════════════════════════════════════════════════════════════════════════════
// src/store/scanner.store.ts
// ══════════════════════════════════════════════════════════════════════════════
export const SCANNER_STORE_PLACEHOLDER = "See src/store/scanner.store.ts below";
/*
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface ScannerState {
  // Pairing
  sessionId: string | null;
  serverUrl: string | null;
  scannerToken: string | null;

  // Connection
  status: ConnectionStatus;

  // Last ack from server
  lastAck: { productName: string; qty: number } | null;

  // Actions
  setPairing: (sessionId: string, serverUrl: string, scannerToken: string) => void;
  setStatus: (s: ConnectionStatus) => void;
  setLastAck: (ack: { productName: string; qty: number } | null) => void;
  clearPairing: () => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = "ann_scanner_pairing";

export const useScannerStore = create<ScannerState>((set, get) => ({
  sessionId: null,
  serverUrl: null,
  scannerToken: null,
  status: "disconnected",
  lastAck: null,

  setPairing: (sessionId, serverUrl, scannerToken) => {
    set({ sessionId, serverUrl, scannerToken });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, serverUrl, scannerToken }));
  },

  setStatus: (status) => set({ status }),
  setLastAck: (lastAck) => set({ lastAck }),

  clearPairing: () => {
    set({ sessionId: null, serverUrl: null, scannerToken: null, status: "disconnected", lastAck: null });
    AsyncStorage.removeItem(STORAGE_KEY);
  },

  loadFromStorage: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { sessionId, serverUrl, scannerToken } = JSON.parse(raw);
      set({ sessionId, serverUrl, scannerToken });
    }
  },
}));
*/

// ══════════════════════════════════════════════════════════════════════════════
// src/hooks/useSocket.ts
// ══════════════════════════════════════════════════════════════════════════════
/*
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useScannerStore } from "../store/scanner.store";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { sessionId, serverUrl, scannerToken, setStatus, clearPairing } = useScannerStore();

  const connect = () => {
    if (!sessionId || !serverUrl || !scannerToken || socketRef.current?.connected) return;

    const socket = io(serverUrl, {
      path: "/socket.io",
      auth: {
        token: scannerToken,
        role: "scanner",
        sessionId,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    // Session expired — clear storage and go back to home
    socket.on("scanner:session-expired", () => {
      clearPairing();
    });

    return socket;
  };

  const disconnect = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const emitScan = (barcode: string, type: string) => {
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit("scanner:scan", {
      barcode,
      type,
      sessionId,
    });
  };

  const onAck = (cb: (data: { productName: string; qty: number }) => void) => {
    socketRef.current?.on("scanner:ack", cb);
    return () => socketRef.current?.off("scanner:ack", cb);
  };

  return { connect, disconnect, emitScan, onAck, socket: socketRef.current };
};
*/

// ══════════════════════════════════════════════════════════════════════════════
// src/screens/HomeScreen.tsx
// ══════════════════════════════════════════════════════════════════════════════
/*
import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useScannerStore } from "../store/scanner.store";

export default function HomeScreen({ navigation }: any) {
  const { loadFromStorage, sessionId, status } = useScannerStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <LinearGradient colors={["#0D1B2E", "#1E3A5F"]} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        // Header
        <View style={styles.header}>
          <Text style={styles.logo}>ANN</Text>
          <Text style={styles.logoSub}>Scanner</Text>
        </View>

        // Status chip
        <View style={styles.statusChip}>
          <View style={[styles.dot, { backgroundColor: sessionId && status === "connected" ? "#34d399" : "#94a3b8" }]} />
          <Text style={styles.statusText}>
            {sessionId && status === "connected" ? "Connected to POS" : "Not connected"}
          </Text>
        </View>

        // Main card
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {sessionId ? "Resume Session" : "Connect to POS"}
          </Text>
          <Text style={styles.cardSub}>
            {sessionId
              ? "Tap below to start scanning for your connected POS"
              : "Scan the QR code shown on the POS screen to connect"}
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate(sessionId ? "Scan" : "Pair")}
          >
            <Text style={styles.primaryBtnText}>
              {sessionId ? "Start Scanning" : "Pair with POS"}
            </Text>
          </TouchableOpacity>

          {sessionId && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("Pair")}
            >
              <Text style={styles.secondaryBtnText}>Connect to a different POS</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>
          Point your camera at the QR code on the POS screen to pair
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 40, fontWeight: "800", color: "#C9A84C", letterSpacing: 4 },
  logoSub: { fontSize: 14, color: "rgba(255,255,255,0.4)", letterSpacing: 6, marginTop: 2 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 32,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    width: "100%", gap: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0D1B2E" },
  cardSub: { fontSize: 13, color: "#64748b", lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#0D1B2E", borderRadius: 14, padding: 16,
    alignItems: "center", marginTop: 8,
  },
  primaryBtnText: { color: "#C9A84C", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { alignItems: "center", padding: 12 },
  secondaryBtnText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  footer: { color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 32, textAlign: "center" },
});
*/

// ══════════════════════════════════════════════════════════════════════════════
// src/screens/PairScreen.tsx — QR scanner to read the pairing QR
// ══════════════════════════════════════════════════════════════════════════════
/*
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, SafeAreaView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import { LinearGradient } from "expo-linear-gradient";
import { useScannerStore } from "../store/scanner.store";

interface QRPayload {
  sessionId: string;
  pin: string;
  serverUrl: string;
}

export default function PairScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualPin, setManualPin] = useState("");
  const [manualSessionId, setManualSessionId] = useState("");
  const [mode, setMode] = useState<"qr" | "manual">("qr");
  const { setPairing } = useScannerStore();

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === "granted");
    });
  }, []);

  const pairWithServer = async (sessionId: string, pin: string, serverUrl: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/v1/scanner/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.meta?.message ?? "Pairing failed");
      setPairing(sessionId, serverUrl, data.data.scannerToken);
      navigation.replace("Scan");
    } catch (err: any) {
      Alert.alert("Pairing Failed", err.message ?? "Could not connect to POS");
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = ({ data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    try {
      const payload: QRPayload = JSON.parse(data);
      if (!payload.sessionId || !payload.pin || !payload.serverUrl) {
        throw new Error("Invalid QR code");
      }
      pairWithServer(payload.sessionId, payload.pin, payload.serverUrl);
    } catch {
      Alert.alert("Invalid QR", "This QR code is not from ANN POS. Try again.");
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0D1B2E" />
        <Text style={styles.permText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission denied.</Text>
        <Text style={styles.permSub}>Enable it in Settings to use the scanner.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setMode("manual")}>
          <Text style={styles.btnText}>Enter PIN manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mode === "qr" ? (
        <>
          // QR scanner
          <Camera
            style={StyleSheet.absoluteFillObject}
            type={CameraType.back}
            onBarCodeScanned={scanned || loading ? undefined : handleQRScan}
            barCodeScannerSettings={{
              barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
            }}
          />

          // Overlay
          <View style={styles.overlay}>
            <View style={styles.scanWindow} />
          </View>

          // Bottom card
          <View style={styles.bottomCard}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0D1B2E" />
                <Text style={styles.loadingText}>Connecting to POS...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.instructions}>
                  Point your camera at the QR code on the POS screen
                </Text>
                <TouchableOpacity onPress={() => setMode("manual")}>
                  <Text style={styles.manualLink}>Enter PIN manually instead</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      ) : (
        // Manual PIN entry
        <SafeAreaView style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Enter PIN Manually</Text>
          <TextInput
            style={styles.input}
            placeholder="Server URL (e.g. http://192.168.1.100)"
            value={manualSessionId}
            onChangeText={setManualSessionId}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            style={styles.input}
            placeholder="Session ID (from QR)"
            value={manualSessionId}
            onChangeText={setManualSessionId}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.pinInput}
            placeholder="PIN (6 chars)"
            value={manualPin}
            onChangeText={setManualPin}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            style={styles.btn}
            onPress={() => pairWithServer(manualSessionId, manualPin, manualSessionId)}
            disabled={loading || manualPin.length !== 6}
          >
            {loading ? <ActivityIndicator color="#C9A84C" /> : (
              <Text style={styles.btnText}>Connect</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("qr")}>
            <Text style={styles.manualLink}>Use QR code instead</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  permText: { fontSize: 16, fontWeight: "700", color: "#0D1B2E", textAlign: "center" },
  permSub: { fontSize: 13, color: "#64748b", textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanWindow: {
    width: 240, height: 240, borderRadius: 16,
    borderWidth: 2, borderColor: "#C9A84C",
    backgroundColor: "transparent",
  },
  bottomCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12, alignItems: "center",
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#0D1B2E", fontWeight: "600" },
  instructions: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20 },
  manualLink: { fontSize: 13, color: "#1E3A5F", fontWeight: "600" },
  backBtn: { padding: 8 },
  backBtnText: { color: "#94a3b8", fontSize: 13 },
  manualContainer: { flex: 1, padding: 24, gap: 16, backgroundColor: "#fff" },
  manualTitle: { fontSize: 22, fontWeight: "800", color: "#0D1B2E", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12,
    padding: 14, fontSize: 13, color: "#0D1B2E",
  },
  pinInput: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12,
    padding: 14, fontSize: 22, fontWeight: "700", color: "#0D1B2E",
    letterSpacing: 6, textAlign: "center",
  },
  btn: {
    backgroundColor: "#0D1B2E", borderRadius: 14, padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#C9A84C", fontWeight: "700", fontSize: 15 },
});
*/

// ══════════════════════════════════════════════════════════════════════════════
// src/screens/ScanScreen.tsx — Main barcode scanning screen
// ══════════════════════════════════════════════════════════════════════════════
/*
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Animated, Vibration,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { io, Socket } from "socket.io-client";
import { useScannerStore } from "../store/scanner.store";

const DEBOUNCE_MS = 1500; // prevent scanning the same barcode twice in quick succession

export default function ScanScreen({ navigation }: any) {
  const { sessionId, serverUrl, scannerToken, status, setStatus, clearPairing, setLastAck } = useScannerStore();
  const socketRef = useRef<Socket | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const [scanResult, setScanResult] = useState<{
    barcode: string; type: string; status: "scanning" | "success" | "error"; message: string;
  } | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  // ── Connect socket ──
  useEffect(() => {
    if (!sessionId || !serverUrl || !scannerToken) {
      navigation.replace("Home");
      return;
    }

    const socket = io(serverUrl, {
      path: "/socket.io",
      auth: { token: scannerToken, role: "scanner", sessionId },
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    // Product ack from server
    socket.on("scanner:ack", (data: { productName: string; qty: number; success: boolean; error?: string }) => {
      if (data.success) {
        setLastAck({ productName: data.productName, qty: data.qty });
        setScanResult((prev) => prev ? ({ ...prev, status: "success", message: `✓ ${data.productName} added to cart` }) : null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setScanResult((prev) => prev ? ({ ...prev, status: "error", message: data.error ?? "Product not found" }) : null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Flash overlay
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      // Clear after 2s
      setTimeout(() => setScanResult(null), 2000);
    });

    // POS disconnected
    socket.on("scanner:pos-disconnected", () => {
      setScanResult({ barcode: "", type: "", status: "error", message: "POS disconnected" });
    });

    // Session expired
    socket.on("scanner:session-expired", () => {
      clearPairing();
      navigation.replace("Home");
    });

    return () => {
      socket.emit("scanner:disconnect-request", { sessionId });
      socket.disconnect();
    };
  }, []);

  // ── Handle barcode scan ──
  const handleBarcodeScan = useCallback(({ type, data }: { type: string; data: string }) => {
    const now = Date.now();
    // Debounce: ignore same barcode within 1.5s
    if (data === lastScannedRef.current && now - lastScannedTimeRef.current < DEBOUNCE_MS) return;
    if (!socketRef.current?.connected) return;

    lastScannedRef.current = data;
    lastScannedTimeRef.current = now;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setScanResult({ barcode: data, type, status: "scanning", message: "Looking up product..." });

    socketRef.current.emit("scanner:scan", {
      barcode: data,
      type,
      sessionId,
    });
  }, [sessionId]);

  const isConnected = status === "connected";

  return (
    <View style={styles.container}>
      // Camera
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={CameraType.back}
        onBarCodeScanned={isConnected ? handleBarcodeScan : undefined}
        barCodeScannerSettings={{
          barCodeTypes: [
            BarCodeScanner.Constants.BarCodeType.ean13,
            BarCodeScanner.Constants.BarCodeType.ean8,
            BarCodeScanner.Constants.BarCodeType.qr,
            BarCodeScanner.Constants.BarCodeType.code128,
            BarCodeScanner.Constants.BarCodeType.code39,
            BarCodeScanner.Constants.BarCodeType.upca,
            BarCodeScanner.Constants.BarCodeType.upce,
          ],
        }}
      />

      // Flash overlay on scan
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.flashOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      // Scan window overlay
      <View style={styles.overlay}>
        <View style={styles.scanWindow}>
          // Corner markers
          {[styles.tl, styles.tr, styles.bl, styles.br].map((corner, idx) => (
            <View key={idx} style={corner} />
          ))}
        </View>
      </View>

      // Top bar
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.connectionChip}>
          <View style={[styles.dot, { backgroundColor: isConnected ? "#34d399" : "#f87171" }]} />
          <Text style={styles.connectionText}>
            {isConnected ? "POS Connected" : "Reconnecting..."}
          </Text>
        </View>
      </SafeAreaView>

      // Bottom result card
      <View style={styles.bottomCard}>
        {scanResult ? (
          <View style={[styles.resultRow, {
            backgroundColor: scanResult.status === "success"
              ? "rgba(16,185,129,0.12)"
              : scanResult.status === "error"
              ? "rgba(239,68,68,0.1)"
              : "rgba(201,168,76,0.1)",
          }]}>
            <Text style={[styles.resultIcon]}>
              {scanResult.status === "success" ? "✓" : scanResult.status === "error" ? "✗" : "⏳"}
            </Text>
            <View>
              <Text style={styles.resultMessage}>{scanResult.message}</Text>
              {scanResult.barcode && (
                <Text style={styles.resultBarcode}>{scanResult.barcode}</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>
            {isConnected
              ? "Point at any barcode to add it to the POS cart"
              : "Connecting to POS..."}
          </Text>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = "#C9A84C";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  flashOverlay: { backgroundColor: "#fff" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  scanWindow: {
    width: 260, height: 180, backgroundColor: "transparent",
    position: "relative",
  },
  tl: { position: "absolute", top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  tr: { position: "absolute", top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  bl: { position: "absolute", bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  br: { position: "absolute", bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 22, color: "#fff", fontWeight: "300" },
  connectionChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  bottomCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: "center",
  },
  hint: { fontSize: 13, color: "#64748b", textAlign: "center" },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, width: "100%",
  },
  resultIcon: { fontSize: 22, fontWeight: "700" },
  resultMessage: { fontSize: 14, fontWeight: "700", color: "#0D1B2E" },
  resultBarcode: { fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginTop: 2 },
});
*/

// ══════════════════════════════════════════════════════════════════════════════
// app.json — Expo config
// ══════════════════════════════════════════════════════════════════════════════
export const APP_JSON = {
  expo: {
    name: "ANN Scanner",
    slug: "ann-scanner",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: { backgroundColor: "#0D1B2E" },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.ann.scanner",
      infoPlist: {
        NSCameraUsageDescription:
          "ANN Scanner uses your camera to scan barcodes and QR codes for the POS system.",
      },
    },
    android: {
      adaptiveIcon: { backgroundColor: "#0D1B2E" },
      package: "com.ann.scanner",
      permissions: ["CAMERA"],
    },
    plugins: [
      ["expo-camera", { cameraPermission: "Allow ANN Scanner to access your camera to scan barcodes." }],
    ],
  },
};

export default {};
