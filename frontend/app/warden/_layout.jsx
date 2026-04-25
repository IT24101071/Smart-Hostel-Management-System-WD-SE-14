import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { storage } from "../../lib/storage";

export default function WardenLayout() {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    let mounted = true;

    (async () => {
      const userData = await storage.getUser();
      if (!mounted) return;

      if (!userData || userData.role !== "warden") {
        await storage.clear();
        setState({ loading: false, ok: false });
        return;
      }

      setState({ loading: false, ok: true });
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
