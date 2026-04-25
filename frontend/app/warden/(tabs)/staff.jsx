import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";

export default function WardenStaffScreen() {
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
        <Text style={styles.title}>Staff Page</Text>
        <Text style={styles.subtitle}>View and manage hostel staff assignments.</Text>

        <View style={styles.card}>
          <Ionicons name="people-outline" size={22} color={COLORS.primary} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Staff module ready</Text>
            <Text style={styles.cardText}>Connect this tab to staff APIs or records when available.</Text>
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
