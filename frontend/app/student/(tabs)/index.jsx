import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import StudentTopBar from '../../../components/student/StudentTopBar';
import { COLORS } from '../../../constants/colors';
import apiClient from '../../../lib/axios';
import { storage } from '../../../lib/storage';
import {
  getBookingReceipt,
  getBookingErrorMessage,
  getMyBookings,
  getMyLatestBooking,
} from '../../../services/booking.service';
import { getMyNotifications } from '../../../services/notification.service';
import { getMyTickets } from '../../../services/ticket.service';
import { getMyVisitorLogs } from '../../../services/visitor.service';

export default function StudentHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);

  const openRooms = useCallback(() => {
    router.push('/student/rooms');
  }, [router]);

  const goBooking = useCallback(() => {
    if (booking?.id) {
      router.push(`/student/booking?bookingId=${encodeURIComponent(String(booking.id))}`);
      return;
    }
    router.push('/student/booking');
  }, [router, booking?.id]);
  const goExpenses = useCallback(() => router.push('/student/expenses'), [router]);
  const goSupport = useCallback(() => router.push('/student/support'), [router]);
  const goIssueHistory = useCallback(
    () => router.push('/student/support?focus=history'),
    [router],
  );
  const goNotifications = useCallback(
    () => router.push('/student/notifications'),
    [router],
  );
  const goVisitorHistory = useCallback(
    () => router.push('/student/visitor-history'),
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

  const refreshTicketCount = useCallback(async () => {
    try {
      const tickets = await getMyTickets();
      const activeCount = tickets.filter((ticket) =>
        ['Open', 'In Progress'].includes(ticket.status),
      ).length;
      setActiveTicketCount(activeCount);
    } catch {
      // Non-blocking for dashboard render
    }
  }, []);

  const refreshVisitorCount = useCallback(async () => {
    try {
      const { meta } = await getMyVisitorLogs({ limit: 100, page: 1 });
      setVisitorCount(Number(meta?.total ?? 0));
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
      refreshTicketCount();
      refreshVisitorCount();
    }, [refreshUnreadCount, refreshTicketCount, refreshVisitorCount]),
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

  const handleDownloadReceipt = useCallback(async () => {
    try {
      let targetBookingId =
        booking?.id && booking?.paymentStatus === 'completed' ? booking.id : null;
      if (!targetBookingId) {
        const bookings = await getMyBookings();
        const latestPaidBooking = bookings.find((item) => item.paymentStatus === 'completed');
        targetBookingId = latestPaidBooking?.id ?? null;
      }
      if (!targetBookingId) {
        Alert.alert('Receipt unavailable', 'No paid booking receipt found yet.');
        return;
      }
      const receipt = await getBookingReceipt(targetBookingId);
      const lines = String(receipt.content ?? '')
        .split('\n')
        .map((line) =>
          line
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;'),
        )
        .join('<br />');
      const html = `<!doctype html><html><head><meta charset="utf-8" /><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 12px}p{margin:0;line-height:1.45;white-space:normal}</style></head><body><h1>Booking Receipt</h1><p>${lines}</p></body></html>`;
      const pdf = await Print.printToFileAsync({
        html,
        base64: true,
      });
      const safeFileName = String(receipt.fileName ?? 'booking-receipt.pdf')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
      const downloadPath = `${FileSystem.documentDirectory}${safeFileName}`;
      if (!pdf.base64) {
        throw new Error('Could not generate receipt PDF data.');
      }
      await FileSystem.writeAsStringAsync(downloadPath, pdf.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo = await FileSystem.getInfoAsync(downloadPath);
      if (!fileInfo.exists) {
        throw new Error('Receipt file was not saved.');
      }
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert('Download complete', `Receipt saved as ${safeFileName}.`);
        return;
      }
      await Sharing.shareAsync(downloadPath, {
        dialogTitle: receipt.fileName ?? 'Download Receipt',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Receipt download failed', getBookingErrorMessage(error));
    }
  }, [booking?.id, booking?.paymentStatus]);

  const stayCard = useMemo(() => {
    if (!booking?.room) return null;
    const checkIn = formatDate(booking.checkInDate);
    const checkOut = formatDate(booking.checkOutDate);
    return {
      roomNo: booking.room.roomNumber,
      checkIn,
      checkOut,
      stayPeriod: `${checkIn} - ${checkOut}`,
      totalDue: booking.totalDue,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
    };
  }, [booking]);

  const isPaid = stayCard?.paymentStatus === 'completed';

  const stayStatusMessage = useMemo(() => {
    if (!stayCard) return '';
    if (stayCard.bookingStatus === 'confirmed') {
      return 'Booking confirmed.';
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
            <LinearGradient
              colors={['#204F95', '#0A192F']}
              locations={[0.351, 0.7115]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.stayCard}
            >
              <View style={styles.stayBadge}>
                <View style={styles.stayBadgeDot} />
                <Text style={styles.stayBadgeText}>Current Stay</Text>
              </View>
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
            </LinearGradient>
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
              subtitle={`Payment ${isPaid ? 'Paid' : stayCard?.paymentStatus ?? 'history available'}`}
              action="Download Receipt"
              onPress={handleDownloadReceipt}
              actionStyle={styles.quickBtnPaid}
              actionTextStyle={styles.quickBtnPaidText}
            />
            <QuickCard
              icon="construct-outline"
              title="Maintenance"
              value={String(activeTicketCount)}
              subtitle={activeTicketCount > 0 ? "Active Issues" : "No Issues"}
              action="Issue History"
              onPress={goIssueHistory}
            />
            <QuickCard
              icon="calendar-outline"
              title="My Stay"
              value={stayCard?.stayPeriod ?? '--'}
              subtitle={`Status: ${stayCard?.bookingStatus ?? 'pending'}`}
              action="Extend Stay"
              onPress={goBooking}
              compactValue
            />
            <QuickCard
              icon="people-outline"
              title="Visitor Log"
              value={`${visitorCount} Person${visitorCount === 1 ? '' : 's'}`}
              subtitle="Visited Per Stay"
              action="History"
              onPress={goVisitorHistory}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickCard({
  icon,
  title,
  value,
  subtitle,
  action,
  onPress,
  actionStyle,
  actionTextStyle,
  compactValue,
}) {
  return (
    <View style={styles.quickCard}>
      <View style={styles.quickCardContent}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
        <Text style={styles.quickTitle}>{title}</Text>
        <Text
          style={[styles.quickValue, compactValue && styles.quickValueCompact]}
        >
          {value}
        </Text>
        <Text style={styles.quickSub}>{subtitle}</Text>
      </View>
      <Pressable style={[styles.quickBtn, actionStyle]} onPress={onPress}>
        <Text style={[styles.quickBtnText, actionTextStyle]}>{action}</Text>
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  stayBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  stayBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#60A5FA',
  },
  stayBadgeText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.primaryLight,
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
    alignItems: 'stretch',
    marginBottom: 16,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  quickCardContent: {
    flexShrink: 1,
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
  quickValueCompact: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
    fontFamily: 'PublicSans_600SemiBold',
  },
  quickSub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickBtn: {
    marginTop: 'auto',
    paddingTop: 10,
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
  quickBtnPaid: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  quickBtnPaidText: {
    color: '#FFFFFF',
  },
});
