import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";

export default function WardenTicketsScreen() {
  const router = useRouter();

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <WardenAppBar
        title="Warden Dashboard"
        subtitle="Smart Hostel Management"
        onLogout={handleLogout}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ticket Receiving</Text>
        <Text style={styles.subtitle}>Receive and track student support or maintenance tickets.</Text>

        <View style={styles.card}>
          <Ionicons name="ticket-outline" size={22} color={COLORS.primary} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>No tickets yet</Text>
            <Text style={styles.cardText}>New incoming tickets will appear on this page.</Text>
          </View>
        </View>
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
    gap: 10,
  },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  cardText: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
