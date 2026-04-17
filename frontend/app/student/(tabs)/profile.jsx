import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { storage } from '../../../lib/storage';

const accountSource = require('../../../assets/icons/account.svg');

export default function StudentProfileScreen() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await storage.getUser();
      if (!cancelled) setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>
        <Image
          source={accountSource}
          style={styles.avatar}
          contentFit="contain"
        />
        <Text style={styles.name}>{user?.name ?? 'Student'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        <Text style={styles.hint}>Student profile</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  inner: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  name: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  hint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
