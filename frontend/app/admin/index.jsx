import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { getAdminMetrics } from "../../services/admin.service";

const DASHBOARD_ITEMS = [
  {
    id: "students",
    title: "Student Management",
    description: "Approve, delete & manage students",
    icon: "people-outline",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    route: "/admin/students",
    active: true,
  },
  {
    id: "wardens",
    title: "Warden Management",
    description: "Create & manage warden accounts",
    icon: "person-add-outline",
    iconColor: "#7C3AED",
    iconBg: "#F5F3FF",
    route: "/admin/wardens",
    active: true,
  },
  {
    id: "rooms",
    title: "Room Management",
    description: "Add, edit & manage hostel rooms",
    icon: "bed-outline",
    iconColor: COLORS.primary,
    iconBg: COLORS.primaryLight,
    route: "/admin/rooms",
    active: true,
  },
  {
<<<<<<< HEAD
=======
    id: "tickets",
    title: "Ticket Management",
    description: "Review and handle student support tickets",
    icon: "ticket-outline",
    iconColor: COLORS.orange,
    iconBg: COLORS.orangeBg,
    route: "/admin/tickets",
    active: true,
  },
  {
>>>>>>> 401fffb (Integrated Warden Dashboard)
    id: "admins",
    title: "Admin Management",
    description: "Create, update & secure admin accounts",
    icon: "shield-checkmark-outline",
    iconColor: COLORS.indigo,
    iconBg: COLORS.indigoBg,
    route: "/admin/admins",
    active: true,
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  function handleCardPress(item) {
    if (item.active && item.route) {
      router.push(item.route);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await getAdminMetrics();
        setMetrics(data);
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>Tap a module to get started</Text>
      </View>

      <View style={styles.metricsWrap}>
        {loadingMetrics ? (
          <View style={styles.metricsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total Admins"
              value={metrics?.totalAdmins ?? 0}
              icon="shield-checkmark-outline"
              iconBg={COLORS.indigoBg}
              iconColor={COLORS.indigo}
            />
            <MetricCard
              label="Active Admins"
              value={metrics?.activeAdmins ?? 0}
              icon="checkmark-circle-outline"
              iconBg={COLORS.availableBg}
              iconColor={COLORS.available}
            />
            <MetricCard
              label="Inactive Admins"
              value={metrics?.inactiveAdmins ?? 0}
              icon="pause-circle-outline"
              iconBg={COLORS.maintenanceBg}
              iconColor={COLORS.maintenance}
            />
            <MetricCard
              label="Actions (7 days)"
              value={metrics?.recentActions ?? 0}
              icon="time-outline"
              iconBg={COLORS.primaryLight}
              iconColor={COLORS.primary}
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {DASHBOARD_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleCardPress(item)}
          >
            <View style={styles.cardInner}>
              <View
                style={[styles.iconContainer, { backgroundColor: item.iconBg }]}
              >
                <Ionicons name={item.icon} size={32} color={item.iconColor} />
              </View>

              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.arrowRow}>
                  <Text style={styles.manageText}>Tap to manage</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={COLORS.primary}
                  />
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={22}
                color={COLORS.primary}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metricsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  metricsLoading: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  cardDescription: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  manageText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.primary,
  },
});
