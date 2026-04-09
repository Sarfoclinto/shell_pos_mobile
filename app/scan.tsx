import { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";
import { useScannerStore } from "../store/scanner.store";

const DEBOUNCE_MS = 1500; // prevent scanning the same barcode twice in quick succession

export default function ScanScreen({ navigation }: any) {
  const {
    sessionId,
    serverUrl,
    scannerToken,
    status,
    setStatus,
    clearPairing,
    setLastAck,
  } = useScannerStore();
  const socketRef = useRef<Socket | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const [scanResult, setScanResult] = useState<{
    barcode: string;
    type: string;
    status: "scanning" | "success" | "error";
    message: string;
  } | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  // ── Connect socket ──
  useEffect(() => {
    if (!sessionId || !serverUrl || !scannerToken) {
      navigation.replace("Home");
      return;
    }

    const socket = io(serverUrl, {
      auth: { token: scannerToken, role: "scanner", sessionId },
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    // Product ack from server
    socket.on(
      "scanner:ack",
      (data: {
        productName: string;
        qty: number;
        success: boolean;
        error?: string;
      }) => {
        if (data.success) {
          setLastAck({ productName: data.productName, qty: data.qty });
          setScanResult((prev) =>
            prev
              ? {
                  ...prev,
                  status: "success",
                  message: `✓ ${data.productName} added to cart`,
                }
              : null,
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setScanResult((prev) =>
            prev
              ? {
                  ...prev,
                  status: "error",
                  message: data.error ?? "Product not found",
                }
              : null,
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        // Flash overlay
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        // Clear after 2s
        setTimeout(() => setScanResult(null), 2000);
      },
    );

    // POS disconnected
    socket.on("scanner:pos-disconnected", () => {
      setScanResult({
        barcode: "",
        type: "",
        status: "error",
        message: "POS disconnected",
      });
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
  }, [
    clearPairing,
    flashAnim,
    navigation,
    scannerToken,
    serverUrl,
    sessionId,
    setLastAck,
    setStatus,
  ]);

  // ── Handle barcode scan ──
  const handleBarcodeScan = useCallback(
    ({ type, data }: { type: string; data: string }) => {
      const now = Date.now();
      // Debounce: ignore same barcode within 1.5s
      if (
        data === lastScannedRef.current &&
        now - lastScannedTimeRef.current < DEBOUNCE_MS
      )
        return;
      if (!socketRef.current?.connected) return;

      lastScannedRef.current = data;
      lastScannedTimeRef.current = now;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setScanResult({
        barcode: data,
        type,
        status: "scanning",
        message: "Looking up product...",
      });

      socketRef.current.emit("scanner:scan", {
        barcode: data,
        type,
        sessionId,
      });
    },
    [sessionId],
  );

  const isConnected = status === "connected";

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={isConnected ? handleBarcodeScan : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "qr", "code128", "code39", "upc_a"],
        }}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.flashOverlay,
          { opacity: flashAnim },
        ]}
        pointerEvents="none"
      />
      <View style={styles.overlay}>
        <View style={styles.scanWindow}>
          {[styles.tl, styles.tr, styles.bl, styles.br].map((corner, idx) => (
            <View key={idx} style={corner} />
          ))}
        </View>
      </View>
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.connectionChip}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isConnected ? "#34d399" : "#f87171" },
            ]}
          />
          <Text style={styles.connectionText}>
            {isConnected ? "POS Connected" : "Reconnecting..."}
          </Text>
        </View>
      </SafeAreaView>
      <View style={styles.bottomCard}>
        {scanResult ? (
          <View
            style={[
              styles.resultRow,
              {
                backgroundColor:
                  scanResult.status === "success"
                    ? "rgba(16,185,129,0.12)"
                    : scanResult.status === "error"
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(201,168,76,0.1)",
              },
            ]}
          >
            <Text style={[styles.resultIcon]}>
              {scanResult.status === "success"
                ? "✓"
                : scanResult.status === "error"
                  ? "✗"
                  : "⏳"}
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  scanWindow: {
    width: 260,
    height: 180,
    backgroundColor: "transparent",
    position: "relative",
  },
  tl: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  tr: {
    position: "absolute",
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  bl: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  br: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 22, color: "#fff", fontWeight: "300" },
  connectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  hint: { fontSize: 13, color: "#64748b", textAlign: "center" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    width: "100%",
  },
  resultIcon: { fontSize: 22, fontWeight: "700" },
  resultMessage: { fontSize: 14, fontWeight: "700", color: "#0D1B2E" },
  resultBarcode: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
    marginTop: 2,
  },
});
