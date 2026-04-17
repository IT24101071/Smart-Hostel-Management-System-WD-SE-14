import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookingBottomBar from '../../../components/student/booking/BookingBottomBar';
import BookingSummaryCard from '../../../components/student/booking/BookingSummaryCard';
import LegalAgreementCard from '../../../components/student/booking/LegalAgreementCard';
import StayDetailsForm from '../../../components/student/booking/StayDetailsForm';
import { LANDING } from '../../../components/landing/landingTheme';
import { COLORS } from '../../../constants/colors';
import { getRoomById, getRoomErrorMessage } from '../../../services/room.service';

export default function StudentBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId, peers, peerInviteId } = useLocalSearchParams();
  const roomIdValue = Array.isArray(roomId) ? roomId[0] : roomId;
  const peersValue = Array.isArray(peers) ? peers[0] : peers;
  const peerInviteIdValue = Array.isArray(peerInviteId) ? peerInviteId[0] : peerInviteId;
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const hasPeers = useMemo(() => {
    if (!peersValue) return false;
    try {
      const parsed = JSON.parse(peersValue);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }, [peersValue]);

  useEffect(() => {
    if (!roomIdValue) {
      setRoom(null);
      setRoomError('Select a room first from Room Details to continue booking.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRoomError('');
      try {
        const data = await getRoomById(roomIdValue);
        if (!cancelled) setRoom(data);
      } catch (e) {
        if (!cancelled) setRoomError(getRoomErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomIdValue]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      setCheckOutDate(null);
    }
  }, [checkInDate, checkOutDate]);

  const stayValidationError = useMemo(() => {
    if (!checkInDate || !checkOutDate) {
      return 'Please enter both check-in and check-out dates.';
    }
    if (checkOutDate <= checkInDate) {
      return 'Check-out date must be after check-in date.';
    }
    return '';
  }, [checkInDate, checkOutDate]);

  const depositSummary = useMemo(() => {
    const monthly = Number(room?.pricePerMonth ?? 0);
    if (!room || stayValidationError) {
      return { amount: monthly, subLabel: 'Per Month' };
    }
    const msPerDay = 86400000;
    const stayDays = Math.floor(
      (checkOutDate.getTime() - checkInDate.getTime()) / msPerDay,
    );
    if (stayDays < 1) {
      return { amount: monthly, subLabel: 'Per Month' };
    }
    const total = Math.round((monthly / 30) * stayDays);
    const subLabel = `Rent for ${stayDays} ${stayDays === 1 ? 'day' : 'days'}`;
    return { amount: total, subLabel };
  }, [room, checkInDate, checkOutDate, stayValidationError]);

  const confirmDisabled = !room || !!roomError || !!stayValidationError || !agreed;

  const confirmDisabledHint = useMemo(() => {
    if (!confirmDisabled) return '';
    const parts = [];
    if (!room || roomError) {
      parts.push(
        roomError ||
          'Open this screen from a room and wait for details to load before paying.',
      );
    }
    if (stayValidationError) {
      parts.push(stayValidationError);
    }
    if (!agreed) {
      parts.push('Tick “I agree to these conditions” under Hostel Rules & Regulations.');
    }
    return parts.join(' ');
  }, [confirmDisabled, room, roomError, stayValidationError, agreed]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/student');
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!room) return;
    await Share.share({
      title: `Room ${room.roomNumber}`,
      message: `Finalize stay for Room ${room.roomNumber} — Rs. ${Number(
        room.pricePerMonth,
      ).toLocaleString()} / Month`,
    });
  }, [room]);

  const handleConfirm = useCallback(() => {
    if (confirmDisabled || !room) return;
    const msPerDay = 86400000;
    const stayDays = Math.max(
      1,
      Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay),
    );
    const q = new URLSearchParams();
    q.set('roomId', String(room.id ?? roomIdValue ?? ''));
    q.set('checkInDate', checkInDate.toISOString());
    q.set('checkOutDate', checkOutDate.toISOString());
    q.set('stayDays', String(stayDays));
    q.set('roomFees', String(Number(depositSummary.amount)));
    q.set('securityDeposit', '5000');
    q.set('totalDue', String(Number(depositSummary.amount) + 5000));
    if (peersValue) q.set('peers', peersValue);
    if (peerInviteIdValue) q.set('peerInviteId', peerInviteIdValue);
    const routeToPayment = (splitMode) => {
      q.set('paymentSplitMode', splitMode === 'split' ? 'split' : 'single');
      router.push(`/student/payment?${q.toString()}`);
    };
    if (hasPeers) {
      const totalDue = Number(depositSummary.amount) + 5000;
      const halfDue = Math.round(totalDue / 2);
      Alert.alert('Choose payment option', 'How do you want to pay for this shared booking?', [
        { text: 'Cancel', style: 'cancel' },
        { text: `Pay full (${totalDue.toLocaleString()})`, onPress: () => routeToPayment('single') },
        { text: `Pay half (${halfDue.toLocaleString()})`, onPress: () => routeToPayment('split') },
      ]);
      return;
    }
    routeToPayment('single');
  }, [
    confirmDisabled,
    room,
    checkInDate,
    checkOutDate,
    depositSummary,
    peersValue,
    hasPeers,
    peerInviteIdValue,
    roomIdValue,
    router,
  ]);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.title}>Finalize Your Stay</Text>
        <Pressable
          style={styles.headerBtn}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 20 + Math.max(insets.bottom, 6) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.helper}>Loading room details...</Text>
          </View>
        ) : roomError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{roomError}</Text>
          </View>
        ) : room ? (
          <BookingSummaryCard room={room} />
        ) : (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Select a room to continue.</Text>
          </View>
        )}

        <View style={styles.section}>
          <StayDetailsForm
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onChangeCheckIn={setCheckInDate}
            onChangeCheckOut={setCheckOutDate}
            errorMessage={checkInDate || checkOutDate ? stayValidationError : ''}
          />
        </View>

        <View style={styles.section}>
          <LegalAgreementCard agreed={agreed} onToggle={() => setAgreed((v) => !v)} />
        </View>

        <View style={styles.section}>
          <View style={styles.bottomInline}>
            <BookingBottomBar
              amount={depositSummary.amount}
              subLabel={depositSummary.subLabel}
              disabled={confirmDisabled}
              disabledHint={confirmDisabledHint}
              onConfirm={handleConfirm}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LANDING.pageBg,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 16,
  },
  section: {
    marginTop: 2,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  helper: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  bannerText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.maintenance,
    textAlign: 'center',
  },
  bottomInline: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
