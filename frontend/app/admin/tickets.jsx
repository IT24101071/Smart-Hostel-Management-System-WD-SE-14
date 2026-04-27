import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../components/admin/AdminSubHeader";
import TicketManagementScreen from "../../components/ticket/TicketManagementScreen";
import { COLORS } from "../../constants/colors";

export default function AdminTicketsScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/admin");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader
        title="Ticketing Management"
        subtitle="Review, assign and resolve complaint tickets"
        onBack={handleBack}
      />
      <View style={styles.container}>
        <TicketManagementScreen showHeader={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
});
