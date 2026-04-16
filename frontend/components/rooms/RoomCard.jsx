import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, STATUS_COLORS } from '../../constants/colors';

export default function RoomCard({ room, onView, onEdit, onDelete }) {
  const statusStyle = STATUS_COLORS[room.availabilityStatus];

  const coverImage = room.images?.[0];

  return (
    <Pressable style={styles.card} onPress={onView}>
      {/* Cover image */}
      {coverImage && (
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.roomIconBox}>
            <Ionicons name="bed-outline" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
            <Text style={styles.roomType}>{room.roomType} Room</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
          <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {room.availabilityStatus}
          </Text>
        </View>
      </View>

      {/* Info Strip */}
      <View style={styles.infoStrip}>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{room.currentOccupancy}/{room.capacity} occupied</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name="cash-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>Rs. {room.pricePerMonth.toLocaleString()}/mo</Text>
        </View>
      </View>

      {/* Description */}
      {room.description ? (
        <Text style={styles.description} numberOfLines={2}>{room.description}</Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable style={styles.actionView} onPress={onView}>
          <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
          <Text style={styles.actionViewText}>View</Text>
        </Pressable>
        <Pressable style={styles.actionEdit} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.actionEditText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.actionDelete} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color={COLORS.maintenance} />
          <Text style={styles.actionDeleteText}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  coverImage: {
    width: '100%',
    height: 140,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNumber: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  roomType: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 11.5,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
  },
  infoText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  description: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12.5,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionView: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
  },
  actionViewText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.primary,
  },
  actionEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 8,
  },
  actionEditText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.maintenanceBg,
    borderRadius: 8,
    paddingVertical: 8,
  },
  actionDeleteText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.maintenance,
  },
});
