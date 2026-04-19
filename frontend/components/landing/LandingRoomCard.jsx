import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import OccupancyGenderBar from '../rooms/OccupancyGenderBar';
import { LANDING } from './landingTheme';
import { buildRoomTags } from './roomTags';

export default function LandingRoomCard({ room, onBookNow }) {
  const cover = room.images?.[0];
  const tags = buildRoomTags(room);

  return (
    <View style={styles.card}>
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={styles.cover}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.roomTitle}>Room No {room.roomNumber}</Text>
          <View style={styles.priceCol}>
            <Text style={styles.price}>
              Rs. {Number(room.pricePerMonth).toLocaleString()}/-
            </Text>
            <Text style={styles.perMonth}>Per Month</Text>
          </View>
        </View>
        <View style={styles.tags}>
          {tags.map((t, i) => (
            <View key={`${room.id}-${i}`} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <OccupancyGenderBar room={room} variant="landing" />
        <Pressable style={styles.bookBtn} onPress={onBookNow}>
          <Text style={styles.bookText}>Book Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LANDING.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cover: {
    width: '100%',
    height: 150,
    backgroundColor: '#E5E7EB',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: 'PublicSans_400Regular',
    color: LANDING.textMuted,
    fontSize: 13,
  },
  body: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  roomTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: LANDING.sectionTitle,
    flex: 1,
  },
  price: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 15,
    color: LANDING.accent,
  },
  perMonth: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: LANDING.accent,
    marginTop: 2,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    backgroundColor: LANDING.accent + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tagText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: LANDING.accentDark,
  },
  bookBtn: {
    backgroundColor: LANDING.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
