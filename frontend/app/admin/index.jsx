import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const DASHBOARD_ITEMS = [
  {
    id: 'rooms',
    title: 'Room Management',
    description: 'Add, edit & manage hostel rooms',
    icon: 'bed-outline',
    iconColor: COLORS.primary,
    iconBg: COLORS.primaryLight,
    route: '/admin/rooms',
    active: true,
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  function handleCardPress(item) {
    if (item.active && item.route) {
      router.push(item.route);
    }
  }

  function handleLogout() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Smart Hostel Management</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>Tap a module to get started</Text>
      </View>

      {/* Grid Menu */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {DASHBOARD_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleCardPress(item)}
          >
            <View style={styles.cardInner}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={32} color={item.iconColor} />
              </View>

              {/* Text */}
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.arrowRow}>
                  <Text style={styles.manageText}>Tap to manage</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </View>
              </View>

              {/* Chevron */}
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  cardDescription: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  manageText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
  },
});
