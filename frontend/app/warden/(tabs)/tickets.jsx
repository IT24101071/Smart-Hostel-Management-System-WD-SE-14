import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import TicketManagementScreen from "../../../components/ticket/TicketManagementScreen";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
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
      <WardenSubHeader
        title="Ticketing Management"
        subtitle="Review, assign and resolve complaint tickets"
      />
      <TicketManagementScreen showHeader={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
