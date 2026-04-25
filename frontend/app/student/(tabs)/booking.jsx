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
import apiClient from '../../../lib/axios';
import { studentMayViewRoom } from '../../../lib/genderRoom';
import { storage } from '../../../lib/storage';
import {
  cancelBooking,
  extendBooking,
  getBookingErrorMessage,
  getMyBookings,
} from '../../../services/booking.service';
import { getRoomById, getRoomErrorMessage } from '../../../services/room.service';

export default function StudentBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId, bookingId } = useLocalSearchParams();
  const roomIdValue = Array.isArray(roomId) ? roomId[0] : roomId;
  const bookingIdValue = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRoomError('');
      try {
        if (roomIdValue) {
          try {
            const { data: me } = await apiClient.get('/auth/me');
            if (me && !cancelled) await storage.setUser(me);
          } catch {
            /* use cached user */
          }
          const user = await storage.getUser();
          const data = await getRoomById(roomIdValue);
          if (cancelled) return;
          if (!studentMayViewRoom(user, data)) {
            setRoom(null);
            setRoomError(
              'This room is not available for your profile. Choose a room that matches your gender category.',
            );
            setConfirmedBooking(null);
            setCheckInDate(null);
            setCheckOutDate(null);
            return;
          }
          if (!cancelled) {
            setRoom(data);
            setConfirmedBooking(null);
            setCheckInDate(null);
            setCheckOutDate(null);
          }
          return;
        }

        const bookings = await getMyBookings();
        const latestConfirmed =
          bookings.find(
            (item) =>
              item?.id === bookingIdValue &&
              item?.bookingStatus === 'confirmed' &&
              item?.room,
          ) ??
          bookings.find((item) => item?.bookingStatus === 'confirmed' && item?.room);
        if (!cancelled) {
          if (!latestConfirmed) {
            setRoom(null);
            setConfirmedBooking(null);
            setCheckInDate(null);
            setCheckOutDate(null);
            setRoomError('No confirmed booking found. Reserve a room to continue.');
            return;
          }
          setConfirmedBooking(latestConfirmed);
          setRoom(latestConfirmed.room);
          setCheckInDate(
            latestConfirmed.checkInDate ? new Date(latestConfirmed.checkInDate) : null,
          );
          setCheckOutDate(
            latestConfirmed.checkOutDate ? new Date(latestConfirmed.checkOutDate) : null,
          );
        }
      } catch (e) {
        if (!cancelled) setRoomError(getRoomErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomIdValue, bookingIdValue]);

  const manageMode = Boolean(confirmedBooking && !roomIdValue);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const originalCheckOutDate = useMemo(() => {
    if (!confirmedBooking?.checkOutDate) return null;
    const d = new Date(confirmedBooking.checkOutDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [confirmedBooking?.checkOutDate]);
  const originalCheckInDate = useMemo(() => {
    if (!confirmedBooking?.checkInDate) return null;
    const d = new Date(confirmedBooking.checkInDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [confirmedBooking?.checkInDate]);
  const hasStayStarted = useMemo(() => {
    if (!originalCheckInDate) return false;
    return today >= originalCheckInDate;
  }, [originalCheckInDate, today]);

  const cancelDeadlineReached = useMemo(() => {
    if (!originalCheckInDate) return false;
    const deadline = new Date(originalCheckInDate);
    deadline.setDate(deadline.getDate() - 1);
    return today > deadline;
  }, [originalCheckInDate, today]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      setCheckOutDate(null);
    }
  }, [checkInDate, checkOutDate]);

  const stayValidationError = useMemo(() => {
    if (manageMode) {
      if (!checkInDate || !checkOutDate) {
        return 'Please enter both check-in and check-out dates.';
      }
      const msPerDay = 86400000;
      const originalDays =
        originalCheckInDate && originalCheckOutDate
          ? Math.max(
            1,
            Math.floor((originalCheckOutDate.getTime() - originalCheckInDate.getTime()) / msPerDay),
          )
          : 1;
      const editedDays = Math.max(
        1,
        Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay),
      );
      if (editedDays < originalDays) {
        return 'Reducing stay is not allowed. You can only keep or extend total stay duration.';
      }
      if (checkOutDate <= checkInDate) {
        return 'Check-out date must be after check-in date.';
      }
      return '';
    }

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (!checkInDate || !checkOutDate) {
      return 'Please enter both check-in and check-out dates.';
    }
    if (checkInDate < tomorrow) {
      return 'Check-in date must be a future date (today is not allowed).';
    }
    if (checkOutDate <= checkInDate) {
      return 'Check-out date must be after check-in date.';
    }
    return '';
  }, [
    manageMode,
    hasStayStarted,
    originalCheckInDate,
    originalCheckOutDate,
    checkInDate,
    checkOutDate,
  ]);

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
    if (manageMode && originalCheckOutDate && originalCheckInDate) {
      const originalDays = Math.max(
        1,
        Math.floor((originalCheckOutDate.getTime() - originalCheckInDate.getTime()) / msPerDay),
      );
      const extraDays = stayDays - originalDays;
      if (extraDays < 0) {
        return { amount: 0, subLabel: 'Reducing stay is not allowed' };
      }
      const extraTotal = Math.round((monthly / 30) * extraDays);
      return {
        amount: extraTotal,
        subLabel:
          extraDays > 0
            ? `Extension for ${extraDays} ${extraDays === 1 ? 'day' : 'days'}`
            : 'No extension amount',
      };
    }
    const subLabel = `Rent for ${stayDays} ${stayDays === 1 ? 'day' : 'days'}`;
    return { amount: total, subLabel };
  }, [
    room,
    checkInDate,
    checkOutDate,
    stayValidationError,
    manageMode,
    originalCheckInDate,
    originalCheckOutDate,
  ]);

  const confirmDisabled =
    !room ||
    !!roomError ||
    !!stayValidationError ||
    !agreed;

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

  const handleConfirm = useCallback(async () => {
    if (confirmDisabled || !room) return;
    if (manageMode && confirmedBooking?.id && Number(depositSummary.amount) <= 0) {
      try {
        await extendBooking(confirmedBooking.id, {
          newCheckInDate: checkInDate.toISOString(),
          newCheckOutDate: checkOutDate.toISOString(),
        });
        Alert.alert('Stay updated', 'Your stay dates were updated successfully.', [
          { text: 'OK', onPress: () => router.replace('/student') },
        ]);
      } catch (error) {
        Alert.alert('Update failed', getBookingErrorMessage(error));
      }
      return;
    }
    const msPerDay = 86400000;
    const stayDays = Math.max(
      1,
      Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay),
    );
    const q = new URLSearchParams();
    q.set('roomId', String(room.id ?? roomIdValue ?? room._id ?? ''));
    q.set('checkInDate', checkInDate.toISOString());
    q.set('checkOutDate', checkOutDate.toISOString());
    q.set('stayDays', String(stayDays));
    q.set('roomFees', String(Number(depositSummary.amount)));
    q.set('securityDeposit', manageMode ? '0' : '1000');
    q.set('totalDue', String(Number(depositSummary.amount) + (manageMode ? 0 : 1000)));
    if (manageMode && confirmedBooking?.id) {
      q.set('manageAction', 'extend');
      q.set('bookingId', String(confirmedBooking.id));
    }
    router.push(`/student/payment?${q.toString()}`);
  }, [
    confirmDisabled,
    room,
    checkInDate,
    checkOutDate,
    depositSummary,
    manageMode,
    confirmedBooking?.id,
    extendBooking,
    roomIdValue,
    router,
  ]);

  const handleCancelStay = useCallback(() => {
    if (!confirmedBooking?.id) return;
    Alert.alert(
      'Cancel stay',
      'Are you sure you want to cancel this stay?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await cancelBooking(confirmedBooking.id);
              Alert.alert(
                'Stay cancelled',
                'Your booking was cancelled successfully. Payment will be reversed within 2 working days.',
                [{ text: 'OK', onPress: () => router.replace('/student') }],
              );
            } catch (error) {
              Alert.alert('Cancel failed', getBookingErrorMessage(error));
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [confirmedBooking?.id, router]);

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
        <Text style={styles.title}>{manageMode ? 'Manage Stay' : 'Finalize Your Stay'}</Text>
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
            {!roomIdValue ? (
              <Pressable style={styles.bannerAction} onPress={() => router.push('/student/rooms')}>
                <Text style={styles.bannerActionText}>Browse Rooms</Text>
              </Pressable>
            ) : null}
          </View>
        ) : room ? (
          <BookingSummaryCard
            room={room}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            paymentStatus={confirmedBooking?.paymentStatus}
            bookingStatus={confirmedBooking?.bookingStatus}
          />
        ) : (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Select a room to continue.</Text>
          </View>
        )}

        <View style={styles.section}>
          {manageMode ? (
            <View style={styles.ruleCard}>
              <Text style={styles.ruleText}>
                {hasStayStarted
                  ? 'Stay started: you can extend your stay only. Reducing stay is not allowed.'
                  : 'Before stay starts: you can edit stay dates, but reducing total stay is not allowed. You can also cancel up to one day before check-in.'}
              </Text>
              {!hasStayStarted ? (
                <Pressable
                  style={[styles.cancelBtn, (cancelDeadlineReached || isCancelling) && styles.cancelBtnDisabled]}
                  onPress={handleCancelStay}
                  disabled={cancelDeadlineReached || isCancelling}
                >
                  <Text style={styles.cancelBtnText}>
                    {cancelDeadlineReached
                      ? 'Cancellation Window Closed'
                      : isCancelling
                        ? 'Cancelling...'
                        : 'Cancel Stay'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <StayDetailsForm
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onChangeCheckIn={setCheckInDate}
            onChangeCheckOut={setCheckOutDate}
            errorMessage={checkInDate || checkOutDate ? stayValidationError : ''}
            disableCheckIn={false}
            disableCheckOut={false}
            checkOutMinimumDate={undefined}
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
  bannerAction: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerActionText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.white,
  },
  ruleCard: {
    backgroundColor: '#EEF4FB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  ruleText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  cancelBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnDisabled: {
    opacity: 0.55,
  },
  cancelBtnText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 12,
    color: COLORS.white,
  },
  bottomInline: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
