import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

export default function AdminTicketsPage() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ticket Management</Text>
        <Text style={styles.subtitle}>
          Manage incoming support and maintenance tickets from one place.
        </Text>

        <View style={styles.card}>
          <Ionicons name="ticket-outline" size={22} color={COLORS.primary} />
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>Ticket section is ready</Text>
            <Text style={styles.cardText}>
              Connect this page to your ticket API to list, update, and close
              tickets.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    lineHeight: 20,
  },
});
