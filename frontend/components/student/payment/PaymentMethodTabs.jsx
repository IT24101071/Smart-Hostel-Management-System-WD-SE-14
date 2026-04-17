import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function PaymentMethodTabs({ value, onChange }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.tab, value === 'card' && styles.tabActive]}
        onPress={() => onChange('card')}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === 'card' }}
      >
        <Text style={[styles.tabText, value === 'card' && styles.tabTextActive]}>
          Card Payment
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, value === 'bank' && styles.tabActive]}
        onPress={() => onChange('bank')}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === 'bank' }}
      >
        <Text style={[styles.tabText, value === 'bank' && styles.tabTextActive]}>
          Bank Deposit
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
});
