import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import StudentTopBar from '../../../components/student/StudentTopBar';
import { COLORS } from '../../../constants/colors';
import apiClient from '../../../lib/axios';
import { storage } from '../../../lib/storage';
import { getMyLatestBooking } from '../../../services/booking.service';
import { getMyNotifications } from '../../../services/notification.service';

export default function StudentHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const openRooms = useCallback(() => {
    router.push('/student/rooms');
  }, [router]);

  const goBooking = useCallback(() => router.push('/student/booking'), [router]);
  const goExpenses = useCallback(() => router.push('/student/expenses'), [router]);
  const goSupport = useCallback(() => router.push('/student/support'), [router]);
  const goNotifications = useCallback(
    () => router.push('/student/notifications'),
    [router],
  );

  const refreshUnreadCount = useCallback(async () => {
    try {
      const notifications = await getMyNotifications();
      const count = notifications.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch {
      // Non-blocking for dashboard render
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userData = await storage.getUser();
      if (!cancelled) setUser(userData);

      // Login payload does not include profileImage; refresh full profile when needed.
      if (!userData?.profileImage) {
        try {
          const { data: me } = await apiClient.get('/auth/me');
          if (!cancelled && me) {
            setUser(me);
            await storage.setUser(me);
          }
        } catch (e) {
          console.error('[StudentHome] Failed to refresh profile:', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setScreenError('');
      try {
        const latest = await getMyLatestBooking();
        if (!cancelled) setBooking(latest);
      } catch (e) {
        if (!cancelled) {
          setScreenError('Could not load your current stay details.');
          console.error('[StudentHome] booking load failed:', e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await storage.clear();
    router.replace('/');
  }

  const stayCard = useMemo(() => {
    if (!booking?.room) return null;
    const peers = Array.isArray(booking.peers) ? booking.peers : [];
    const pendingPeerCount = peers.filter((p) => p?.status === 'pending').length;
    return {
      roomNo: booking.room.roomNumber,
      checkIn: formatDate(booking.checkInDate),
      checkOut: formatDate(booking.checkOutDate),
      totalDue: booking.totalDue,
      peerCount: peers.length,
      pendingPeerCount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      viewerRole: booking.viewerRole,
      ownPeerStatus: booking.ownPeerStatus,
    };
  }, [booking]);

  const stayStatusMessage = useMemo(() => {
    if (!stayCard) return '';
    if (stayCard.bookingStatus === 'confirmed') {
      return 'Booking confirmed.';
    }
    if (stayCard.viewerRole === 'peer') {
      if (stayCard.ownPeerStatus === 'pending') {
        return 'Invitation pending. Open notifications to accept this stay.';
      }
      if (stayCard.ownPeerStatus === 'accepted') {
        return 'You accepted. Waiting for other peers to approve.';
      }
      if (stayCard.ownPeerStatus === 'rejected') {
        return 'You rejected this invitation.';
      }
    }
    if (stayCard.pendingPeerCount > 0) {
      return `Waiting for peer approval (${stayCard.pendingPeerCount} ${
        stayCard.pendingPeerCount === 1 ? 'peer' : 'peers'
      } pending).`;
    }
    return 'Booking is in pending state.';
  }, [stayCard]);

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StudentTopBar
          userName={user?.name}
          profileImage={user?.profileImage}
          onLogout={handleLogout}
          onNotificationPress={goNotifications}
          notificationCount={unreadCount}
        />
        <View style={styles.pageBody}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.helper, { marginTop: 10 }]}>Loading your stay…</Text>
            </View>
          ) : screenError ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{screenError}</Text>
            </View>
          ) : stayCard ? (
            <View style={styles.stayCard}>
              <Text style={styles.stayBadge}>Current Stay</Text>
              <Text style={styles.stayTitle}>Room No {stayCard.roomNo}</Text>
              <View style={styles.stayRow}>
                <View style={styles.stayCol}>
                  <Text style={styles.stayKey}>Check In</Text>
                  <Text style={styles.stayVal}>{stayCard.checkIn}</Text>
                </View>
                <View style={styles.stayCol}>
                  <Text style={styles.stayKey}>Check Out</Text>
                  <Text style={styles.stayVal}>{stayCard.checkOut}</Text>
                </View>
              </View>
              <Text style={styles.peerPendingText}>{stayStatusMessage}</Text>
              <Pressable style={styles.manageBtn} onPress={goBooking}>
                <Text style={styles.manageText}>Manage Stay</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>No stay found yet. Reserve a room to begin.</Text>
              <Pressable style={styles.bannerAction} onPress={openRooms}>
                <Text style={styles.bannerActionText}>Browse Rooms</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.quickGrid}>
            <QuickCard
              icon="wallet-outline"
              title="Finance"
              value={`Rs. ${Number(stayCard?.totalDue ?? 0).toLocaleString()}`}
              subtitle={`Payment ${stayCard?.paymentStatus ?? 'pending'}`}
              action="Pay Now"
              onPress={goExpenses}
            />
            <QuickCard
              icon="construct-outline"
              title="Maintenance"
              value={stayCard ? '1 Active' : 'No Issues'}
              subtitle="Water Tap Repair"
              action="Issue History"
              onPress={goSupport}
            />
            <QuickCard
              icon="calendar-outline"
              title="My Stay"
              value={stayCard?.checkOut ?? '--'}
              subtitle={`Status: ${stayCard?.bookingStatus ?? 'pending'}`}
              action="Extend Stay"
              onPress={goBooking}
            />
            <QuickCard
              icon="people-outline"
              title="Visitor Log"
              value={`${(stayCard?.peerCount ?? 0) + (stayCard ? 1 : 0)} Person(s)`}
              subtitle="Visited Per Stay"
              action="History"
              onPress={goSupport}
            />
          </View>

          <Text style={styles.annHeading}>Hostel Announcements</Text>
          <View style={styles.annCardRed}>
            <Text style={styles.annTitle}>Water Maintenance</Text>
            <Text style={styles.annBody}>
              Scheduled water maintenance on Sunday, April 5th, from 10:00 AM to
              2:00 PM. Please store water in advance.
            </Text>
          </View>
          <View style={styles.annCardWhite}>
            <Text style={styles.annTitleDark}>Late Entry Warning</Text>
            <Text style={styles.annBodyDark}>
              Reminder: All residents must be inside the hostel premises by
              10:30 PM unless prior permission is obtained via the app.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickCard({ icon, title, value, subtitle, action, onPress }) {
  return (
    <View style={styles.quickCard}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickValue}>{value}</Text>
      <Text style={styles.quickSub}>{subtitle}</Text>
      <Pressable style={styles.quickBtn} onPress={onPress}>
        <Text style={styles.quickBtnText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function formatDate(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    backgroundColor: COLORS.studentScreenBackground,
  },
  pageBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  helper: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  bannerText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  bannerAction: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bannerActionText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.white,
  },
  stayCard: {
    backgroundColor: '#0B2D5A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  stayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.25)',
    color: '#CFE2FF',
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  stayTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 38,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  stayRow: {
    flexDirection: 'row',
    gap: 18,
  },
  stayCol: {
    flex: 1,
  },
  stayKey: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: '#AFC6E6',
    marginBottom: 4,
  },
  stayVal: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  peerPendingText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: '#FFD88A',
    marginTop: 10,
  },
  manageBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  manageText: {
    fontFamily: 'PublicSans_700Bold',
    color: COLORS.white,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },
  quickTitle: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  quickValue: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 30,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  quickSub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickBtn: {
    marginTop: 10,
    borderColor: '#7FB2E2',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickBtnText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: '#337EC4',
  },
  annHeading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 38,
    color: '#000000',
    marginBottom: 10,
  },
  annCardRed: {
    backgroundColor: '#B8131A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  annCardWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  annTitle: {
    fontFamily: 'PublicSans_700Bold',
    color: '#FFFFFF',
    fontSize: 23,
    marginBottom: 4,
  },
  annBody: {
    fontFamily: 'PublicSans_500Medium',
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  annTitleDark: {
    fontFamily: 'PublicSans_700Bold',
    color: '#111827',
    fontSize: 23,
    marginBottom: 4,
  },
  annBodyDark: {
    fontFamily: 'PublicSans_500Medium',
    color: '#374151',
    fontSize: 14,
    lineHeight: 18,
  },
});
