import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { LANDING } from '../../landing/landingTheme';
import { COLORS } from '../../../constants/colors';

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

export default function BookingSummaryCard({
  room,
  checkInDate,
  checkOutDate,
  paymentStatus,
  bookingStatus,
}) {
  const cover = room?.images?.[0];
  const roomType = String(room?.roomType ?? '--');
  const capacity = Number(room?.capacity ?? 0);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Room No {room.roomNumber}</Text>
          <Text style={styles.body}>{roomType} room</Text>
          <Text style={styles.body}>Rs. {Number(room?.pricePerMonth ?? 0).toLocaleString()} / month</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{capacity > 0 ? `${capacity} Beds` : 'Beds --'}</Text>
        <Text style={styles.metaPill}>Check In: {formatDate(checkInDate)}</Text>
        <Text style={styles.metaPill}>Check Out: {formatDate(checkOutDate)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.statusPill}>Booking: {bookingStatus ?? '--'}</Text>
        <Text style={styles.statusPill}>Payment: {paymentStatus ?? '--'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerContent: {
    flex: 1,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: 'PublicSans_400Regular',
    color: LANDING.textMuted,
    fontSize: 13,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  body: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: '#EEF4FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPill: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
    backgroundColor: 'rgba(51,126,196,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
