import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { LANDING } from '../../landing/landingTheme';
import { COLORS } from '../../../constants/colors';

export default function BookingSummaryCard({ room }) {
  const cover = room?.images?.[0];

  return (
    <View style={styles.card}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={styles.cover}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>No image available</Text>
        </View>
      )}

      <Text style={styles.title}>Room No {room.roomNumber}</Text>
      <Text style={styles.body}>
        {room.description?.trim()
          ? room.description
          : 'Enjoy premium room facilities and a comfortable stay.'}
      </Text>
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
  cover: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
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
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
