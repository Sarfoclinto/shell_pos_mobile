import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ScanHistoryItem as ScanHistoryItemType } from "../store/scanner.store";
import { formatTime, getRelativeTime } from "../utils/dateFormat";

interface ScanHistoryItemProps {
  item: ScanHistoryItemType;
  onDelete?: (barcode: string) => void;
  onPress?: (item: ScanHistoryItemType) => void;
  style?: ViewStyle;
}

export function ScanHistoryItem({
  item,
  onDelete,
  onPress,
  style,
}: ScanHistoryItemProps) {
  const isSuccess = item.status === "success";
  const statusColor = isSuccess ? "#10b981" : "#ef4444";
  const statusIcon = isSuccess ? "✓" : "✗";

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Barcode */}
          <Text style={styles.barcode} numberOfLines={1}>
            {item.barcode}
          </Text>

          {/* Product Name and Timestamp */}
          <View style={styles.metaRow}>
            {item.productName && (
              <Text style={styles.productName} numberOfLines={1}>
                {item.productName}
              </Text>
            )}
            <Text style={styles.timestamp}>
              {formatTime(item.timestamp)} • {getRelativeTime(item.timestamp)}
            </Text>
          </View>
        </View>

        {/* Delete Button (if provided) */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(item.barcode);
            }}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Text style={styles.deleteIcon}>⊘</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  mainContent: {
    flex: 1,
    gap: 4,
  },
  barcode: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0D1B2E",
    fontFamily: "monospace",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productName: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
  },
  timestamp: {
    fontSize: 11,
    color: "#94a3b8",
  },
  deleteButton: {
    padding: 6,
  },
  deleteIcon: {
    fontSize: 18,
    color: "#ef4444",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginTop: 12,
  },
});
