import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import {
  getMyVisitorLogs,
  getVisitorErrorMessage,
} from "../../services/visitor.service";

const FILTERS = [
  { key: "", label: "All" },
  { key: "checked_in", label: "Checked In" },
  { key: "overdue", label: "Overdue" },
  { key: "checked_out", label: "Checked Out" },
];

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function statusStyle(status) {
  if (status === "overdue")
    return { bg: "#FEE2E2", border: "#FECACA", text: "#991B1B" };
  if (status === "checked_in")
    return { bg: "#DCFCE7", border: "#BBF7D0", text: "#166534" };
  if (status === "checked_out")
    return { bg: "#F3F4F6", border: "#E5E7EB", text: "#4B5563" };
  return { bg: COLORS.background, border: COLORS.border, text: COLORS.textSecondary };
}

function statusLabel(status) {
  if (status === "checked_in") return "Checked in";
  if (status === "overdue") return "Overdue";
  if (status === "checked_out") return "Checked out";
  return status || "—";
}

export default function StudentVisitorHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filterKey, setFilterKey] = useState("");

  const load = useCallback(
    async (isPullRefresh = false) => {
      if (isPullRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const { data } = await getMyVisitorLogs({
          status: filterKey || undefined,
          limit: 100,
          page: 1,
        });
        setItems(data);
      } catch (e) {
        setError(getVisitorErrorMessage(e));
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterKey],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const onRefresh = useCallback(() => {
    load(true);
  }, [load]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/student");
  }, [router]);

  const filterChips = useMemo(
    () =>
      FILTERS.map((f) => {
        const active = filterKey === f.key;
        return (
          <Pressable
            key={f.key || "all"}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setFilterKey(f.key)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        );
      }),
    [filterKey],
  );

  const renderItem = ({ item }) => {
    const theme = statusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.visitorName} numberOfLines={1}>
            {item.fullName || "Visitor"}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.text }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.metaLine}>
          {item.relationshipToStudent || "—"} · {item.purposeOfVisit || "—"}
        </Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Check-in</Text>
          <Text style={styles.detailVal}>{formatDt(item.checkInAt)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expected out</Text>
          <Text style={styles.detailVal}>{formatDt(item.expectedTimeOut)}</Text>
        </View>
        {item.checkOutAt ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-out</Text>
            <Text style={styles.detailVal}>{formatDt(item.checkOutAt)}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Visitor history</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.chipRow}>{filterChips}</View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.helper}>Loading visitors…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(false)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No visitors logged yet</Text>
              <Text style={styles.emptySub}>
                When your warden registers a visitor for you, it will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  visitorName: {
    flex: 1,
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
  },
  metaLine: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  detailLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  detailVal: {
    flex: 1,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: "right",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  helper: {
    marginTop: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.maintenance,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.white,
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
