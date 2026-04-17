import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

const accountSource = require('../../assets/icons/account.svg');

export default function StudentTopBar({
  userName,
  onLogout,
  onNotificationPress,
}) {
  function handleBell() {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }
    Alert.alert('Notifications', 'No new notifications.');
  }

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Image
          source={accountSource}
          style={styles.avatar}
          contentFit="contain"
        />
        <View style={styles.titles}>
          <Text style={styles.welcome} numberOfLines={1}>
            Welcome, {userName || 'Student'}
          </Text>
          <Text style={styles.sub}>Smart Hostel</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Pressable
          style={styles.iconBtn}
          onPress={handleBell}
          hitSlop={8}
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={COLORS.textSecondary}
          />
        </Pressable>
        <Pressable
          style={styles.logoutBtn}
          onPress={onLogout}
          hitSlop={8}
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  welcome: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 17,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  logoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.white,
    fontSize: 13,
  },
});
