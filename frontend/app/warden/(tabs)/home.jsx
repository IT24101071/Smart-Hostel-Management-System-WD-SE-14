import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";
import { getRooms } from "../../../services/room.service";
import { getAllTickets } from "../../../services/ticket.service";
import { getVisitors } from "../../../services/visitor.service";
import { getStaffList } from "../../../services/warden.service";

export default function WardenHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    ticketsOpen: 0,
    ticketsHigh: 0,
    visitorsInside: 0,
    visitorsOverdue: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalRooms: 0,
    occupiedRooms: 0,
  });

  const occupancyRate = useMemo(() => {
    if (!stats.totalRooms) return 0;
    return Math.round((stats.occupiedRooms / stats.totalRooms) * 100);
  }, [stats.occupiedRooms, stats.totalRooms]);

  const fetchDashboardData = useCallback(async ({ withLoader = true } = {}) => {
    try {
      if (withLoader) setLoading(true);
      const [ticketRes, visitorInRes, visitorOverdueRes, staffRes, roomsRes] = await Promise.all([
        getAllTickets({ status: "Open" }),
        getVisitors({ status: "checked_in", page: 1, limit: 200 }),
        getVisitors({ status: "overdue", page: 1, limit: 200 }),
        getStaffList({ page: 1, limit: 100 }),
        getRooms({ limit: 300 }),
      ]);

      const openTickets = Array.isArray(ticketRes?.tickets) ? ticketRes.tickets : [];
      const highUrgencyCount = openTickets.filter((ticket) => ticket?.urgency === "High").length;
      const rooms = Array.isArray(roomsRes?.rooms) ? roomsRes.rooms : [];
      const occupiedRooms = rooms.filter((room) => {
        const current = Number(room?.currentOccupancy ?? 0);
        return current > 0;
      }).length;

      setStats({
        ticketsOpen: Number(ticketRes?.meta?.total ?? openTickets.length ?? 0),
        ticketsHigh: highUrgencyCount,
        visitorsInside: Number(visitorInRes?.meta?.total ?? visitorInRes?.data?.length ?? 0),
        visitorsOverdue: Number(visitorOverdueRes?.meta?.total ?? visitorOverdueRes?.data?.length ?? 0),
        totalStaff: Number(staffRes?.meta?.totalStaff ?? staffRes?.users?.length ?? 0),
        activeStaff: Number(staffRes?.meta?.activeStaff ?? 0),
        totalRooms: rooms.length,
        occupiedRooms,
      });
    } finally {
      if (withLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [userData] = await Promise.all([storage.getUser(), fetchDashboardData({ withLoader: true })]);
      setUser(userData);
    })();
  }, [fetchDashboardData]);

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData({ withLoader: false });
    setRefreshing(false);
  }, [fetchDashboardData]);

  return (
    <View style={styles.root}>
      <WardenAppBar
        title="Warden Dashboard"
        subtitle="Smart Hostel Management"
        onLogout={handleLogout}
      />
      <WardenSubHeader
        title="Home Overview"
        subtitle="Track day-to-day hostel operations in one place"
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
            <Text style={styles.summaryLabel}>Open Tickets</Text>
            <Text style={styles.summaryValue}>{stats.ticketsOpen}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>High Priority</Text>
            <Text style={styles.summaryValue}>{stats.ticketsHigh}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue Visitors</Text>
            <Text style={styles.summaryValue}>{stats.visitorsOverdue}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Operations Snapshot</Text>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>Visitors currently inside: {stats.visitorsInside}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="people-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>
              Staff active: {stats.activeStaff} / {stats.totalStaff}
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="bed-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>
              Room occupancy: {stats.occupiedRooms} / {stats.totalRooms} ({occupancyRate}%)
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActionGrid}>
            <Pressable style={styles.quickActionButton} onPress={() => router.push("/warden/(tabs)/tickets")}>
              <Ionicons name="ticket-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Tickets</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => router.push("/warden/(tabs)/visitor-log-book")}
            >
              <Ionicons name="walk-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Visitors</Text>
            </Pressable>
            <Pressable style={styles.quickActionButton} onPress={() => router.push("/warden/(tabs)/staff")}>
              <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Staff</Text>
            </Pressable>
            <Pressable style={styles.quickActionButton} onPress={() => router.push("/warden/(tabs)/rooms")}>
              <Ionicons name="home-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Rooms</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.row}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>Warden</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  loadingWrap: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  summaryLabel: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
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
  cardText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  rowText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionButton: {
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
});
