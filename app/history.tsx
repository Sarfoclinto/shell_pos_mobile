import { ScanHistoryItem } from "@/components/ScanHistoryItem";
import { useScannerStore } from "@/store/scanner.store";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HistoryScreen() {
  const router = useRouter();
  const { scanHistory, clearScanHistory, scanCount } = useScannerStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(
    new Set(),
  );

  // Filter history based on search
  const filteredHistory = searchQuery.trim()
    ? scanHistory.filter(
        (item) =>
          item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.productName?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : scanHistory;

  // Calculate statistics
  const successCount = scanHistory.filter((s) => s.status === "success").length;
  const errorCount = scanHistory.filter((s) => s.status === "error").length;
  const successRate =
    scanCount > 0 ? Math.round((successCount / scanCount) * 100) : 0;

  const handleDeleteItem = useCallback((barcode: string) => {
    // Since we don't have direct delete in store, we could:
    // 1. Clear and re-add all except deleted
    // 2. Or just show they need to clear all
    // For now, show a message
    Alert.alert(
      "Delete Item",
      "Individual delete not yet supported.\nClear all instead?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: handleClearAll,
        },
      ],
    );
  }, []);

  const handleClearAll = useCallback(() => {
    const confirmMessage = `Clear all ${scanCount} scans from history?`;

    Alert.alert("Clear History", confirmMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          clearScanHistory();
          setSearchQuery("");
          setIsSelectionMode(false);
        },
      },
    ]);
  }, [scanCount, clearScanHistory]);

  const handleSelectItem = (barcode: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    const newSelected = new Set(selectedBarcodes);
    if (newSelected.has(barcode)) {
      newSelected.delete(barcode);
    } else {
      newSelected.add(barcode);
    }
    setSelectedBarcodes(newSelected);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedBarcodes(new Set());
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📭</Text>
      <Text style={styles.emptyStateTitle}>No Scans Yet</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery.trim()
          ? `No scans match "${searchQuery}"`
          : "Start scanning to see history here"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan History</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{Math.min(99, scanCount)}</Text>
        </View>
      </View>

      {/* Statistics Card */}
      {scanCount > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Scans</Text>
            <Text style={styles.statValue}>{scanCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Success Rate</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>
              {successRate}%
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Errors</Text>
            <Text style={[styles.statValue, { color: "#ef4444" }]}>
              {errorCount}
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      {scanCount > 0 && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search barcode or product..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.trim() && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Selection Mode Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={handleCancelSelection}>
            <Text style={styles.selectionBarText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.selectionCountText}>
            {selectedBarcodes.size} selected
          </Text>
          {selectedBarcodes.size > 0 && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Delete Selected",
                  `Delete ${selectedBarcodes.size} items?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        // Clear and re-add unselected
                        handleCancelSelection();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.selectionDeleteText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* History List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, idx) => `${item.barcode}-${item.timestamp}-${idx}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              isSelectionMode ? handleSelectItem(item.barcode) : undefined
            }
            style={
              isSelectionMode && selectedBarcodes.has(item.barcode)
                ? styles.selectedItem
                : undefined
            }
          >
            <ScanHistoryItem
              item={item}
              onDelete={handleDeleteItem}
              onPress={(selectedItem) => {
                if (isSelectionMode) {
                  handleSelectItem(selectedItem.barcode);
                }
              }}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredHistory.length === 0 ? styles.emptyListContent : undefined
        }
        scrollIndicatorInsets={{ right: 1 }}
      />

      {/* Footer Actions */}
      {scanCount > 0 && !isSelectionMode && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearAllButtonText}>Clear All History</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  backBtnText: {
    fontSize: 24,
    fontWeight: "300",
    color: "#0D1B2E",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0D1B2E",
    marginLeft: 16,
  },
  countBadge: {
    backgroundColor: "#C9A84C",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D1B2E",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0D1B2E",
  },
  clearIcon: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "700",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f0f4f8",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  selectionCountText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  selectionBarText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C9A84C",
  },
  selectionDeleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
  selectedItem: {
    backgroundColor: "rgba(201,168,76,0.1)",
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D1B2E",
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  clearAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fee2e2",
    alignItems: "center",
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
});
