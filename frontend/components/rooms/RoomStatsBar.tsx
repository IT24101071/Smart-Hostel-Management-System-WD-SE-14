import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Room } from '../../types/room';

type RoomStatsBarProps = {
  rooms: Room[];
};

export default function RoomStatsBar({ rooms }: RoomStatsBarProps) {
  const available = rooms.filter((r) => r.availabilityStatus === 'Available').length;
  const full = rooms.filter((r) => r.availabilityStatus === 'Full').length;
  const maintenance = rooms.filter((r) => r.availabilityStatus === 'Maintenance').length;

  return (
    <View style={styles.container}>
      <StatItem value={rooms.length} label="Total" />
      <View style={styles.divider} />
      <StatItem value={available} label="Available" valueColor={COLORS.available} />
      <View style={styles.divider} />
      <StatItem value={full} label="Full" valueColor={COLORS.full} />
      <View style={styles.divider} />
      <StatItem value={maintenance} label="Maintenance" valueColor={COLORS.maintenance} />
    </View>
  );
}

function StatItem({ value, label, valueColor }: { value: number; label: string; valueColor?: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
});
