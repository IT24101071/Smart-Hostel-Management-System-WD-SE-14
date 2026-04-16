import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export const ROOM_FILTERS = ['All', 'Available', 'Full', 'Maintenance'];

export default function RoomFilterTabs({ activeFilter, onChange }) {
  return (
    <View style={styles.container}>
      {ROOM_FILTERS.map((f) => (
        <Pressable
          key={f}
          style={[styles.tab, activeFilter === f && styles.tabActive]}
          onPress={() => onChange(f)}
        >
          <Text style={[styles.tabText, activeFilter === f && styles.tabTextActive]}>
            {f}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.white,
  },
});
