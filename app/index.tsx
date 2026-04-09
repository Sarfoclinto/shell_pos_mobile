import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useScannerStore } from "../store/scanner.store";

export default function Index() {
  const { sessionId, status } = useScannerStore();
  const router = useRouter();

  // if (!isHydrated) {
  //   return (
  //     <LinearGradient colors={["#0D1B2E", "#1E3A5F"]} style={styles.container}>
  //       <View style={styles.safe}>
  //         <ActivityIndicator size="large" color="#C9A84C" />
  //       </View>
  //     </LinearGradient>
  //   );
  // }

  return (
    <LinearGradient colors={["#0D1B2E", "#1E3A5F"]} style={styles.container}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.logo}>SHELL</Text>
          <Text style={styles.logoSub}>Scanner</Text>
        </View>

        <View style={styles.statusChip}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  sessionId && status === "connected" ? "#34d399" : "#94a3b8",
              },
            ]}
          />
          <Text style={styles.statusText}>
            {sessionId && status === "connected"
              ? "Connected to POS"
              : "Not connected"}
          </Text>
        </View>

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
            onPress={() => router.push(sessionId ? "/scan" : "/pair")}
          >
            <Text style={styles.primaryBtnText}>
              {sessionId ? "Start Scanning" : "Pair with POS"}
            </Text>
          </TouchableOpacity>

          {sessionId && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/pair")}
            >
              <Text style={styles.secondaryBtnText}>
                Connect to a different POS
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>
          Point your camera at the QR code on the POS screen to pair
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 40, fontWeight: "800", color: "#C9A84C", letterSpacing: 4 },
  logoSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 6,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 32,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0D1B2E" },
  cardSub: { fontSize: 13, color: "#64748b", lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#0D1B2E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#C9A84C", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { alignItems: "center", padding: 12 },
  secondaryBtnText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  footer: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    marginTop: 32,
    textAlign: "center",
  },
});
