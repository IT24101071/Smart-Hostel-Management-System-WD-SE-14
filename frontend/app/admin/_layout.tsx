import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { storage } from '../../lib/storage';

/**
 * Route-level guard for the entire /admin subtree.
 *
 * On every mount it reads the stored user from SecureStore:
 *   • No session  → redirect to login
 *   • Role ≠ admin → clear session + redirect to login
 *   • Role = admin → render child screens normally
 */
export default function AdminLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function guard() {
      const user = await storage.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      if (user.role !== 'admin') {
        await storage.clear();
        router.replace('/');
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

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
