import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BankTransferDetails from '../../components/student/payment/BankTransferDetails';
import CardPaymentFields from '../../components/student/payment/CardPaymentFields';
import PaymentMethodTabs from '../../components/student/payment/PaymentMethodTabs';
import PaymentSummaryCard from '../../components/student/payment/PaymentSummaryCard';
import ReceiptUploadZone from '../../components/student/payment/ReceiptUploadZone';
import { COLORS } from '../../constants/colors';
import {
  DEFAULT_SECURITY_DEPOSIT_LKR,
  PAYMENT_PAGE_BG,
} from '../../constants/paymentBank';
import {
  createBooking,
  getBookingErrorMessage,
} from '../../services/booking.service';
import { getRoomById, getRoomErrorMessage } from '../../services/room.service';

function useRoomIdParam() {
  const { roomId, checkInDate, checkOutDate, stayDays, roomFees, securityDeposit, totalDue, peers, peerInviteId, paymentSplitMode } =
    useLocalSearchParams();
  const pick = (value) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');
  return {
    roomId: pick(roomId),
    checkInDate: pick(checkInDate),
    checkOutDate: pick(checkOutDate),
    stayDays: pick(stayDays),
    roomFees: pick(roomFees),
    securityDeposit: pick(securityDeposit),
    totalDue: pick(totalDue),
    peers: pick(peers),
    peerInviteId: pick(peerInviteId),
    paymentSplitMode: pick(paymentSplitMode),
  };
}

function digitsOnly(s) {
  return String(s ?? '').replace(/\D/g, '');
}

function isValidExpiry(expiry) {
  const cleaned = String(expiry).trim();
  const match = cleaned.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const mm = parseInt(match[1], 10);
  const yy = parseInt(match[2], 10);
  if (mm < 1 || mm > 12) return false;
  const fullYear = 2000 + yy;
  const lastDayOfMonth = new Date(fullYear, mm, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return lastDayOfMonth >= today;
}

export default function StudentPaymentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bookingParams = useRoomIdParam();
  const roomIdValue = bookingParams.roomId;
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!roomIdValue) {
      setLoading(false);
      setError('Missing room. Open payment from room details.');
      setRoom(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRoomById(roomIdValue);
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
  }, [roomIdValue]);

  const parsedPeers = useMemo(() => {
    if (!bookingParams.peers) return [];
    try {
      const value = JSON.parse(bookingParams.peers);
      return Array.isArray(value)
        ? value.map((v) => String(v ?? '').trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }, [bookingParams.peers]);

  const deposit = useMemo(() => {
    const n = Number(bookingParams.securityDeposit);
    if (Number.isFinite(n) && n >= 0) return n;
    return DEFAULT_SECURITY_DEPOSIT_LKR;
  }, [bookingParams.securityDeposit]);

  const roomFees = useMemo(() => {
    const n = Number(bookingParams.roomFees);
    if (Number.isFinite(n) && n >= 0) return n;
    return Number(room?.pricePerMonth ?? 0);
  }, [bookingParams.roomFees, room]);

  const total = useMemo(() => {
    const n = Number(bookingParams.totalDue);
    if (Number.isFinite(n) && n >= 0) return n;
    return deposit + roomFees;
  }, [bookingParams.totalDue, deposit, roomFees]);

  const hasBookingDates = Boolean(bookingParams.checkInDate && bookingParams.checkOutDate);
  const splitMode =
    parsedPeers.length > 0 && bookingParams.paymentSplitMode === 'split'
      ? 'split'
      : 'single';
  const splitPayAmount = useMemo(() => Math.round(total / 2), [total]);
  const payNowAmount = splitMode === 'split' ? splitPayAmount : total;

  const cardPayReady = useMemo(() => {
    const num = digitsOnly(cardNumber);
    const cv = digitsOnly(cvc);
    return (
      num.length >= 15 &&
      isValidExpiry(expiry) &&
      cv.length >= 3 &&
      cv.length <= 4
    );
  }, [cardNumber, expiry, cvc]);

  const bankPayReady = Boolean(receipt?.uri);

  const payDisabled =
    isPaying || (method === 'card' ? !cardPayReady : !bankPayReady);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/student');
  }, [router]);

  const handlePayNow = useCallback(async () => {
    if (payDisabled) return;
    setIsPaying(true);
    try {
      const payload = {
        roomId: roomIdValue,
        checkInDate: bookingParams.checkInDate,
        checkOutDate: bookingParams.checkOutDate,
        stayDays: Number(bookingParams.stayDays),
        roomFees,
        securityDeposit: deposit,
        totalDue: total,
        paymentMethod: method,
        paymentSplitMode: splitMode,
        amountPaidNow: payNowAmount,
        peers: parsedPeers,
        peerInviteId: bookingParams.peerInviteId || undefined,
        receipt: method === 'bank' ? receipt : undefined,
        cardMasked:
          method === 'card'
            ? (() => {
                const digits = digitsOnly(cardNumber);
                return digits ? `**** **** **** ${digits.slice(-4)}` : undefined;
              })()
            : undefined,
      };
      await createBooking(payload);
      setIsPaying(false);
      Alert.alert(
        'Payment successful',
        splitMode === 'split'
          ? 'Your half payment is completed. The remaining half is pending from your peer.'
          : 'Your payment was completed successfully.',
        [{ text: 'OK', onPress: () => router.replace('/student') }],
      );
    } catch (e) {
      setIsPaying(false);
      Alert.alert('Payment failed', getBookingErrorMessage(e));
    }
  }, [
    payDisabled,
    roomIdValue,
    bookingParams.checkInDate,
    bookingParams.checkOutDate,
    bookingParams.stayDays,
    roomFees,
    deposit,
    total,
    method,
    splitMode,
    payNowAmount,
    parsedPeers,
    bookingParams.peerInviteId,
    receipt,
    cardNumber,
    router,
  ]);

  const onExpiryChange = useCallback((text) => {
    const d = digitsOnly(text).slice(0, 4);
    let formatted = d;
    if (d.length > 2) {
      formatted = `${d.slice(0, 2)}/${d.slice(2)}`;
    }
    setExpiry(formatted);
  }, []);

  const onCardNumberChange = useCallback((text) => {
    const d = digitsOnly(text).slice(0, 19);
    const parts = [];
    for (let i = 0; i < d.length; i += 4) {
      parts.push(d.slice(i, i + 4));
    }
    setCardNumber(parts.join(' ').trim());
  }, []);

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
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.headerIcon} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.muted}>Loading payment…</Text>
        </View>
      ) : error || !room || !hasBookingDates ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error ||
              (!hasBookingDates
                ? 'Missing stay details. Open payment from Finalize Your Stay.'
                : 'Room not found.')}
          </Text>
          <Pressable onPress={handleBack} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: 24 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PaymentSummaryCard
            total={total}
            deposit={deposit}
            roomFees={roomFees}
            payableNow={payNowAmount}
            splitMode={splitMode}
          />
          <PaymentMethodTabs value={method} onChange={setMethod} />
          <View style={styles.panel}>
            {method === 'card' ? (
              <CardPaymentFields
                cardNumber={cardNumber}
                expiry={expiry}
                cvc={cvc}
                onCardNumberChange={onCardNumberChange}
                onExpiryChange={onExpiryChange}
                onCvcChange={(t) => setCvc(digitsOnly(t).slice(0, 4))}
              />
            ) : (
              <>
                <BankTransferDetails />
                <ReceiptUploadZone receipt={receipt} onReceiptChange={setReceipt} />
              </>
            )}
          </View>
          <Pressable
            style={[styles.payBtn, payDisabled && styles.payBtnDisabled]}
            onPress={handlePayNow}
            disabled={payDisabled}
            accessibilityState={{ disabled: payDisabled }}
          >
            {isPaying ? (
              <>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.payBtnText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={COLORS.white} />
                <Text style={styles.payBtnText}>Pay Now</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAYMENT_PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 12,
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
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  panel: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  payBtnDisabled: {
    opacity: 0.45,
  },
  payBtnText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  muted: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 12,
  },
  backLinkText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.primaryLight,
  },
});
