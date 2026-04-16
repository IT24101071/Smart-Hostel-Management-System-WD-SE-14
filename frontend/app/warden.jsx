import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { storage } from "../lib/storage";

export default function WardenDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const userData = await storage.getUser();
      if (!userData || userData.role !== "warden") {
        await storage.clear();
        router.replace("/");
        return;
      }
      setUser(userData);
      setReady(true);
    }
    loadUser();
  }, [router]);

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Welcome, {user?.name}!</Text>
            <Text style={styles.headerSub}>Warden Portal</Text>
          </View>
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </Pressable>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={56} color={COLORS.primary} />
        </View>

        <Text style={styles.successTitle}>Sign In Successful!</Text>

        <Text style={styles.successMessage}>
          You have successfully logged into the warden portal.
        </Text>

        <View style={styles.userInfoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={COLORS.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.primary}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>Warden</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusBox}>
          <Ionicons name="construct-outline" size={24} color="#F59E0B" />
          <Text style={styles.statusTitle}>Features Coming Soon</Text>
        </View>

        <Pressable style={styles.logoutButtonLarge} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.white,
  },
  headerSub: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: "center",
  },
  successIcon: {
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  successMessage: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  userInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  statusBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  statusTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: "#92400E",
    marginTop: 8,
  },
  statusText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "#B45309",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  logoutButtonLarge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: COLORS.white,
  },
});
