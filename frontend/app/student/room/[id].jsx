import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANDING } from '../../../components/landing/landingTheme';
import PeerInviteCard from '../../../components/student/room/PeerInviteCard';
import RoomImageCarousel from '../../../components/student/room/RoomImageCarousel';
import { COLORS } from '../../../constants/colors';
import { getRoomById, getRoomErrorMessage } from '../../../services/room.service';

const accountSource = require('../../../assets/icons/account.svg');
const TAB_BAR_HEIGHT = 58;

function useRoomIdParam() {
  const { id } = useLocalSearchParams();
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
}

export default function StudentRoomDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const roomId = useRoomIdParam();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setError('Missing room.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRoomById(roomId);
        if (!cancelled) setRoom(data);
      } catch (e) {
        if (!cancelled) setError(getRoomErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/student');
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!room) return;
    const price = Number(room.pricePerMonth).toLocaleString();
    try {
      await Share.share({
        title: `Room ${room.roomNumber}`,
        message: `Room ${room.roomNumber} — Rs. ${price}/month\n${room.roomType}, ${room.capacity} bed(s).`,
      });
    } catch {
      /* user dismissed */
    }
  }, [room]);

  const confirmBooking = useCallback(() => {
    const q = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
    router.push(`/student/booking${q}`);
  }, [router, roomId]);

  const goHome = useCallback(() => {
    router.push('/student');
  }, [router]);

  const goBookingTab = useCallback(() => {
    router.push('/student/booking');
  }, [router]);

  const goExpenses = useCallback(() => {
    router.push('/student/expenses');
  }, [router]);

  const goSupport = useCallback(() => {
    router.push('/student/support');
  }, [router]);

  const goProfile = useCallback(() => {
    router.push('/student/profile');
  }, [router]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerIcon}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Room Details</Text>
        <Pressable
          style={styles.headerIcon}
          onPress={handleShare}
          disabled={!room}
          hitSlop={12}
          accessibilityLabel="Share room"
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={room ? COLORS.primary : COLORS.border}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={LANDING.accent} />
          <Text style={styles.muted}>Loading room…</Text>
        </View>
      ) : error || !room ? (
        <View style={[styles.centered, styles.errorPad]}>
          <Text style={styles.errorText}>{error || 'Room not found.'}</Text>
          <Pressable onPress={handleBack} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <RoomImageCarousel uris={room.images} />

          <View style={styles.sheet}>
            <Text style={styles.roomTitle}>Room No {room.roomNumber}</Text>
            <Text style={styles.subtitle}>
              {room.roomType} · {room.capacity} bed{room.capacity !== 1 ? 's' : ''}
              {room.availabilityStatus
                ? ` · ${room.availabilityStatus}`
                : ''}
            </Text>
            <Text style={styles.priceLine}>
              Rs. {Number(room.pricePerMonth).toLocaleString()} / Month
            </Text>

            <View style={styles.tags}>
              {[
                `${room.capacity} Bed${room.capacity !== 1 ? 's' : ''}`,
                room.roomType,
              ].map((t, i) => (
                <View key={`tag-${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={styles.peerWrap}>
              <PeerInviteCard />
            </View>

            <Text style={styles.sectionHeading}>About This Space</Text>
            <Text style={styles.aboutBody}>
              {room.description?.trim() ||
                'No description has been added for this room yet.'}
            </Text>

            <Pressable style={styles.confirmBtn} onPress={confirmBooking}>
              <Text style={styles.confirmText}>Confirm Booking</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <Pressable style={styles.tabItem} onPress={goHome}>
          <Ionicons name="home-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={goBookingTab}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Booking</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={goExpenses}>
          <Ionicons name="cash-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Expenses</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={goSupport}>
          <Ionicons name="chatbubble-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Support</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={goProfile}>
          <Image
            source={accountSource}
            style={[styles.profileIcon, { opacity: 0.55 }]}
            contentFit="contain"
          />
          <Text style={styles.tabLabel}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LANDING.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sheet: {
    backgroundColor: COLORS.white,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  roomTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
    color: LANDING.sectionTitle,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: LANDING.textMuted,
    marginBottom: 10,
  },
  priceLine: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: LANDING.accent,
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: LANDING.accent + '22',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: LANDING.accentDark,
  },
  peerWrap: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: LANDING.sectionTitle,
    marginTop: 8,
    marginBottom: 8,
  },
  aboutBody: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: LANDING.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorPad: {
    flexGrow: 1,
  },
  muted: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: LANDING.textMuted,
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 15,
    color: COLORS.maintenance,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 12,
  },
  backLinkText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: LANDING.accent,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: TAB_BAR_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  profileIcon: {
    width: 22,
    height: 22,
  },
});
