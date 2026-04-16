import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminAppBar from "../../components/admin/AdminAppBar";
import { COLORS } from "../../constants/colors";
import { storage } from "../../lib/storage";

export default function AdminLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function guard() {
      const user = await storage.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      if (user.role !== "admin") {
        await storage.clear();
        router.replace("/");
        return;
      }

      setReady(true);
    }

    guard();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <SafeAreaView edges={["top"]} style={styles.appBarSafe}>
        <AdminAppBar />
      </SafeAreaView>
      <View style={styles.stackWrap}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appBarSafe: {
    backgroundColor: COLORS.primary,
  },
  stackWrap: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
