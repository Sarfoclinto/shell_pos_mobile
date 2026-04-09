import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useScannerStore } from "../store/scanner.store";

interface QRPayload {
  sessionId: string;
  pin: string;
  serverUrl: string;
}

export default function PairScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualServerUrl, setManualServerUrl] = useState("");
  const [manualPin, setManualPin] = useState("");
  const [manualSessionId, setManualSessionId] = useState("");
  const [mode, setMode] = useState<"qr" | "manual">("qr");
  const { setPairing } = useScannerStore();
  const router = useRouter();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const pairWithServer = async (
    sessionId: string,
    pin: string,
    serverUrl: string,
  ) => {
    setLoading(true);
    try {
      // 'fetch' does not support WebSocket (ws://) schemes. We must convert it to http://
      // check also for wss and replace with https
      const fetchUrl = serverUrl
        .replace(/^ws/, "http")
        .replace(/^wss/, "https");
      const res = await fetch(`${fetchUrl}/api/v1/scanner/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.meta?.message ?? "Pairing failed");
      setPairing(sessionId, serverUrl, data.data.scannerToken);
      router.replace("/scan");
    } catch (err: any) {
      console.error("pair error: ", err);
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
      Alert.alert(
        "Invalid QR",
        "This QR code is not from SHELL POS. Try again.",
      );
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
        <Text style={styles.permSub}>
          Enable it in Settings to use the scanner.
        </Text>
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
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned || loading ? undefined : handleQRScan}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417", "code128"],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanWindow} />
          </View>
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
                  <Text style={styles.manualLink}>
                    Enter PIN manually instead
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Enter PIN Manually</Text>
          <TextInput
            style={styles.input}
            placeholder="Server URL (e.g. http://[IP_ADDRESS])"
            value={manualServerUrl}
            onChangeText={setManualServerUrl}
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
            onPress={() =>
              pairWithServer(manualSessionId, manualPin, manualServerUrl)
            }
            disabled={loading || manualPin.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#C9A84C" />
            ) : (
              <Text style={styles.btnText}>Connect</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("qr")}>
            <Text style={styles.manualLink}>Use QR code instead</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  permText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D1B2E",
    textAlign: "center",
  },
  permSub: { fontSize: 13, color: "#64748b", textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanWindow: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#C9A84C",
    backgroundColor: "transparent",
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
    gap: 12,
    alignItems: "center",
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#0D1B2E", fontWeight: "600" },
  instructions: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  manualLink: { fontSize: 13, color: "#1E3A5F", fontWeight: "600" },
  backBtn: { padding: 8 },
  backBtnText: { color: "#94a3b8", fontSize: 13 },
  manualContainer: { flex: 1, padding: 24, gap: 16, backgroundColor: "#fff" },
  manualTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0D1B2E",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    color: "#0D1B2E",
  },
  pinInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#0D1B2E",
    letterSpacing: 6,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#0D1B2E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#C9A84C", fontWeight: "700", fontSize: 15 },
});
