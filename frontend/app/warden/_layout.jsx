import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { storage } from "../../lib/storage";

export default function WardenLayout() {
  const [state, setState] = useState({ loading: true, ok: false, role: "" });

  useEffect(() => {
    let mounted = true;

    (async () => {
      const userData = await storage.getUser();
      if (!mounted) return;

      const role = userData?.role;
      if (!userData || role !== "warden") {
        if (!userData || !role) {
          await storage.clear();
        }
        setState({ loading: false, ok: false, role: role || "" });
        return;
      }

      setState({ loading: false, ok: true, role });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!state.ok) {
    if (state.role === "staff") {
      return <Redirect href="/staff" />;
    }
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            flex: 1,
            backgroundColor: COLORS.background,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },
});
