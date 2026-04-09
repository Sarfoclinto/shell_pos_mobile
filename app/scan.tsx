import { ScanAckData } from "@/types/api";
import { useAudioPlayer } from "expo-audio";
import { BarcodeScanningResult, CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

const DEBOUNCE_MS = 3000; // increased from 1500ms for better scanning UX
const RESULT_CLEAR_TIMEOUT_SUCCESS = 5000; // success notification stays 5 seconds
const RESULT_CLEAR_TIMEOUT_ERROR = 4000; // error notification stays 4 seconds

export default function ScanScreen() {
  const {
    sessionId,
    serverUrl,
    scannerToken,
    status,
    setStatus,
    scanMode,
    setScanMode,
    audioEnabled,
    setAudioEnabled,
    scanCount,
    scanHistory,
    addScanHistory,
    clearPairing,
    setLastAck,
  } = useScannerStore();
  const socketRef = useRef<Socket | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const clearTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const router = useRouter();

  // Audio players
  const scanPlayer = useAudioPlayer(require("@/assets/audio/scan.mp3"));
  const successPlayer = useAudioPlayer(require("@/assets/audio/success.mp3"));
  const errorPlayer = useAudioPlayer(require("@/assets/audio/error.mp3"));

  const [scanResult, setScanResult] = useState<{
    barcode: string;
    type: string;
    status: "scanning" | "success" | "error";
    message: string;
  } | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  // Set audio volume
  useEffect(() => {
    scanPlayer.volume = 0.7;
    successPlayer.volume = 0.7;
    errorPlayer.volume = 0.7;
  }, [scanPlayer, successPlayer, errorPlayer]);

  // ── Connect socket ──
  useEffect(() => {
    if (!sessionId || !serverUrl || !scannerToken) {
      // clearPairing();
      router.replace("/");
      return;
    }

    // Initialize audio on mount
    // setupAudio().catch(console.error);

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
    socket.on("scanner:ack", (data: ScanAckData) => {
      isProcessingRef.current = false;

      if (data && data.received) {
        if (data.product) {
          setLastAck({
            productName: data.product.name,
            qty: data.product.stockQuantity || 0,
          });
          // Add to scan history
          addScanHistory({
            barcode: lastScannedRef.current || "",
            timestamp: Date.now(),
            status: "success",
            productName: data.product.name,
          });
          setScanResult((prev) =>
            prev
              ? {
                  ...prev,
                  status: "success",
                  message: `✓ ${data?.product?.name} added to cart`,
                }
              : null,
          );
          // Play success sound
          if (audioEnabled) {
            // successPlayer.currentTime = 0;
            successPlayer.play();
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Keep success notification for 5 seconds
          if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
          clearTimeoutRef.current = setTimeout(
            () => setScanResult(null),
            RESULT_CLEAR_TIMEOUT_SUCCESS,
          );
        } else {
          if (data.mode === "add-to-cart") {
            // Add to scan history as error
            addScanHistory({
              barcode: lastScannedRef.current || "",
              timestamp: Date.now(),
              status: "error",
            });
            setScanResult((prev) =>
              prev
                ? {
                    ...prev,
                    status: "error",
                    message: data.error ?? "Product not found",
                  }
                : null,
            );
            // Play error sound
            if (audioEnabled) {
              // errorPlayer.currentTime = 0;
              errorPlayer.play();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Keep error notification for 4 seconds
            if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
            clearTimeoutRef.current = setTimeout(
              () => setScanResult(null),
              RESULT_CLEAR_TIMEOUT_ERROR,
            );
          }
        }
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
    });

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
      router.replace("/");
    });

    return () => {
      socket.emit("scanner:disconnect-request", { sessionId });
      socket.disconnect();
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, [
    addScanHistory,
    audioEnabled,
    clearPairing,
    errorPlayer,
    flashAnim,
    router,
    scannerToken,
    serverUrl,
    sessionId,
    setLastAck,
    setStatus,
    successPlayer,
  ]);

  // ── Handle barcode scan ──
  const handleBarcodeScan = useCallback(
    (result: BarcodeScanningResult) => {
      // Prevent overlapping scans
      if (isProcessingRef.current) return;

      const now = Date.now();
      const { data, type } = result;

      // Debounce: ignore same barcode within 3 seconds
      if (
        data === lastScannedRef.current &&
        now - lastScannedTimeRef.current < DEBOUNCE_MS
      )
        return;
      if (!socketRef.current?.connected) return;

      isProcessingRef.current = true;
      lastScannedRef.current = data;
      lastScannedTimeRef.current = now;

      // Play scan sound
      if (audioEnabled) {
        // scanPlayer.currentTime = 0;
        scanPlayer.play();
      }
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
        mode: scanMode,
      });

      // Reset processing flag after timeout (safety net)
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    },
    [audioEnabled, scanMode, scanPlayer, sessionId],
  );

  const isConnected = status === "connected";

  const handleCloseScanResult = useCallback(() => {
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    setScanResult(null);
  }, []);

  // Calculate statistics
  const successCount = scanHistory.filter((s) => s.status === "success").length;
  const errorCount = scanHistory.filter((s) => s.status === "error").length;
  const successRate =
    scanCount > 0 ? Math.round((successCount / scanCount) * 100) : 0;

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
        <Text style={styles.scanHint}>Center barcode in frame</Text>
      </View>
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
        <View style={styles.topRightSection}>
          <TouchableOpacity
            onPress={() => setAudioEnabled(!audioEnabled)}
            style={styles.audioToggle}
            accessible={true}
            accessibilityLabel={
              audioEnabled ? "Audio enabled" : "Audio disabled"
            }
            accessibilityRole="switch"
          >
            <Text style={styles.audioToggleText}>
              {audioEnabled ? "🔊" : "🔇"}
            </Text>
          </TouchableOpacity>
          {isConnected && (
            <TouchableOpacity
              style={styles.scanCountBadge}
              onPress={() => router.push("/history")}
              accessible={true}
              accessibilityLabel={`${scanCount} scans, tap to view history`}
              accessibilityRole="button"
            >
              <Text style={styles.scanCountText}>
                {Math.min(99, scanCount)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
      <View style={styles.bottomCard}>
        {scanResult ? (
          <>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.resultMessage}>{scanResult.message}</Text>
                {scanResult.barcode && (
                  <Text style={styles.resultBarcode}>{scanResult.barcode}</Text>
                )}
              </View>
              {scanResult.status === "success" && (
                <TouchableOpacity
                  onPress={handleCloseScanResult}
                  style={styles.closeButton}
                  accessible={true}
                  accessibilityLabel="Close notification"
                  accessibilityRole="button"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {scanResult.status === "error" && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  handleCloseScanResult();
                  // User can re-scan
                }}
                accessible={true}
                accessibilityLabel="Close error"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Dismiss</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              {isConnected
                ? `Mode: ${scanMode === "add-to-cart" ? "Add to Cart" : "Regular Scan"}`
                : "Connecting to POS..."}
            </Text>

            {/* Statistics Card */}
            {isConnected && scanCount > 0 && (
              <View style={styles.statsWidget}>
                <View style={styles.statsPairItem}>
                  <Text style={styles.statsLabel}>Success Rate</Text>
                  <Text
                    style={[
                      styles.statsValue,
                      { color: successRate >= 80 ? "#10b981" : "#C9A84C" },
                    ]}
                  >
                    {successRate}%
                  </Text>
                </View>
                <View style={styles.statsBarrier} />
                <View style={styles.statsPairItem}>
                  <Text style={styles.statsLabel}>Scans</Text>
                  <Text style={styles.statsValue}>{scanCount}</Text>
                </View>
                <View style={styles.statsBarrier} />
                <View style={styles.statsPairItem}>
                  <Text style={styles.statsLabel}>Errors</Text>
                  <Text
                    style={[
                      styles.statsValue,
                      { color: errorCount > 0 ? "#ef4444" : "#10b981" },
                    ]}
                  >
                    {errorCount}
                  </Text>
                </View>
              </View>
            )}

            {isConnected && (
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    scanMode === "regular" && styles.modeButtonActive,
                  ]}
                  onPress={() => setScanMode("regular")}
                  accessible={true}
                  accessibilityLabel="Regular scan mode"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scanMode === "regular" }}
                >
                  <Text style={styles.modeButtonIcon}>📱</Text>
                  <Text
                    style={[
                      styles.modeButtonText,
                      scanMode === "regular" && styles.modeButtonTextActive,
                    ]}
                  >
                    Regular Scan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    scanMode === "add-to-cart" && styles.modeButtonActive,
                  ]}
                  onPress={() => setScanMode("add-to-cart")}
                  accessible={true}
                  accessibilityLabel="Add to cart mode"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: scanMode === "add-to-cart" }}
                >
                  <Text style={styles.modeButtonIcon}>🛒</Text>
                  <Text
                    style={[
                      styles.modeButtonText,
                      scanMode === "add-to-cart" && styles.modeButtonTextActive,
                    ]}
                  >
                    Add to Cart
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
    backgroundColor: "rgba(0,0,0,0.65)", // darker overlay (was 0.45)
  },
  scanHint: {
    position: "absolute",
    bottom: 100,
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
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
  topRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioToggleText: { fontSize: 16 },
  scanCountBadge: {
    backgroundColor: "#C9A84C",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCountText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  hint: { fontSize: 13, color: "#64748b", textAlign: "center" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    width: "100%",
    position: "relative",
  },
  resultIcon: { fontSize: 22, fontWeight: "700" },
  resultMessage: { fontSize: 14, fontWeight: "700", color: "#0D1B2E" },
  resultBarcode: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  modeSelector: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    borderColor: "#C9A84C",
    backgroundColor: "rgba(201,168,76,0.1)",
  },
  modeButtonIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  modeButtonTextActive: {
    color: "#C9A84C",
  },
  statsWidget: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statsPairItem: {
    flex: 1,
    alignItems: "center",
  },
  statsBarrier: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  statsLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D1B2E",
  },
});
