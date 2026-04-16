import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { storage } from "../../lib/storage";

export default function AdminAppBar() {
  const router = useRouter();

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.sub}>Smart Hostel Management</Text>
      </View>
      <Pressable style={styles.logout} onPress={handleLogout} hitSlop={8}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  left: {
    flex: 1,
  },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  logout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
