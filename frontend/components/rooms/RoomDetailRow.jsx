import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function RoomDetailRow({
  icon,
  label,
  value,
  valueColor,
  noBorder,
}) {
  return (
    <View style={[styles.row, noBorder && styles.rowNoBorder]}>
      <View style={styles.left}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13.5,
    color: COLORS.textMuted,
  },
  value: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
});
