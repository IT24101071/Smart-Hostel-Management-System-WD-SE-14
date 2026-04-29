import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";
import { getMyAssignedTickets } from "../../../services/ticket.service";

export default function StaffHomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, open: 0, resolved: 0 });

  const completionRate = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.resolved / stats.total) * 100);
  }, [stats.resolved, stats.total]);

  const loadData = useCallback(async ({ withLoader = true } = {}) => {
    try {
      if (withLoader) setLoading(true);
      const { tickets } = await getMyAssignedTickets({});
      const list = Array.isArray(tickets) ? tickets : [];
      setStats({
        total: list.length,
        inProgress: list.filter((t) => t.status === "In Progress").length,
        open: list.filter((t) => t.status === "Open").length,
        resolved: list.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
      });
    } finally {
      if (withLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData({ withLoader: true });
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData({ withLoader: false });
    setRefreshing(false);
  }, [loadData]);

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <WardenAppBar title="Staff Dashboard" subtitle="Smart Hostel Management" onLogout={handleLogout} />
      <WardenSubHeader
        title="Home Overview"
        subtitle="Track your assigned maintenance work"
        onBack={() => router.replace("/staff")}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Assigned</Text>
            <Text style={styles.summaryValue}>{stats.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>In Progress</Text>
            <Text style={styles.summaryValue}>{stats.inProgress}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resolved</Text>
            <Text style={styles.summaryValue}>{stats.resolved}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Snapshot</Text>
          <View style={styles.row}>
            <Ionicons name="timer-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>Open tasks: {stats.open}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>Completion rate: {completionRate}%</Text>
          </View>
        </View>
        <Pressable style={styles.actionBtn} onPress={() => router.push("/staff/(tabs)/tickets")}>
          <Ionicons name="ticket-outline" size={18} color={COLORS.white} />
          <Text style={styles.actionBtnText}>Go To My Tickets</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  loadingWrap: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  summaryLabel: { fontFamily: "PublicSans_400Regular", fontSize: 12, color: COLORS.textMuted },
  summaryValue: {
    marginTop: 4,
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  rowText: { fontFamily: "PublicSans_500Medium", fontSize: 14, color: COLORS.textSecondary },
  actionBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
});
