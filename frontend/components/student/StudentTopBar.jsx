import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

const accountSource = require('../../assets/icons/account.svg');

export default function StudentTopBar({
  userName,
  profileImage,
  onLogout,
  onNotificationPress,
  notificationCount = 0,
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
        <View style={styles.avatarFrame}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <Image
              source={accountSource}
              style={styles.avatar}
              contentFit="contain"
            />
          )}
        </View>
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
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          ) : null}
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
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: -1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.maintenance,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'PublicSans_700Bold',
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 12,
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
