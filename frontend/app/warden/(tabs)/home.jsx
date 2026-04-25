import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";

export default function WardenHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const userData = await storage.getUser();
      setUser(userData);
    })();
  }, []);

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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Summary</Text>
          <Text style={styles.cardText}>Use the tabs below to manage tickets, staff, students, and rooms.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>{user?.name || "Not available"}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            <Text style={styles.rowText}>{user?.email || "Not available"}</Text>
          </View>
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
