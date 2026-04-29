import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import TicketManagementScreen from "../../../components/ticket/TicketManagementScreen";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";

export default function StaffTicketsScreen() {
  const router = useRouter();

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <WardenAppBar title="Staff Dashboard" subtitle="Smart Hostel Management" onLogout={handleLogout} />
      <WardenSubHeader
        title="Ticket Management"
        subtitle="View and manage your assigned tickets"
        onBack={() => router.replace("/staff")}
      />
      <TicketManagementScreen headerTitle="My Assigned Work" showHeader={false} staffOnly={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
