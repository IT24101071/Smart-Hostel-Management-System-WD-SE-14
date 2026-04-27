import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

export default function WardenAppBar({ title = "Warden Dashboard", subtitle = "Smart Hostel Management", onLogout }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.bar}>
        <View style={styles.left}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>

        <Pressable style={styles.logout} onPress={onLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.primary,
  },
  bar: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 72,
  },
  left: {
    flex: 1,
    justifyContent: "center",
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
