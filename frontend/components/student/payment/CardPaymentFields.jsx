import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function CardPaymentFields({
  cardNumber,
  expiry,
  cvc,
  onCardNumberChange,
  onExpiryChange,
  onCvcChange,
}) {
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, '0'),
      })),
    [],
  );

  const yearOptions = useMemo(() => {
    const start = currentYear;
    return Array.from({ length: 15 }, (_, i) => start + i);
  }, [currentYear]);

  function parseExpiry(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      return { month: currentMonth, year: currentYear };
    }
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const isMonthOk = month >= 1 && month <= 12;
    const isYearOk = Number.isFinite(year);
    if (!isMonthOk || !isYearOk) {
      return { month: currentMonth, year: currentYear };
    }
    return { month, year };
  }

  function openExpiryPicker() {
    const parsed = parseExpiry(expiry);
    setSelectedMonth(parsed.month);
    setSelectedYear(parsed.year);
    setShowExpiryPicker(true);
  }

  function applyExpirySelection() {
    const mm = String(selectedMonth).padStart(2, '0');
    const yy = String(selectedYear).slice(-2);
    onExpiryChange(`${mm}/${yy}`);
    setShowExpiryPicker(false);
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Card Details</Text>
      <Text style={styles.fieldLabel}>Card number</Text>
      <TextInput
        style={styles.input}
        placeholder="0000 0000 0000 0000"
        placeholderTextColor={COLORS.textMuted}
        value={cardNumber}
        onChangeText={onCardNumberChange}
        keyboardType="number-pad"
        maxLength={19}
        autoCorrect={false}
        accessibilityLabel="Card number"
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.fieldLabel}>Expiry Date</Text>
          <Pressable
            style={styles.inputWithIcon}
            onPress={openExpiryPicker}
            accessibilityRole="button"
            accessibilityLabel="Select expiry month and year"
          >
            <TextInput
              style={styles.inputInner}
              placeholder="MM/YY"
              placeholderTextColor={COLORS.textMuted}
              value={expiry}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>
        <View style={styles.half}>
          <Text style={styles.fieldLabel}>CVC</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.inputInner}
              placeholder="•••"
              placeholderTextColor={COLORS.textMuted}
              value={cvc}
              onChangeText={onCvcChange}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoCorrect={false}
              accessibilityLabel="Card security code"
            />
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
          </View>
        </View>
      </View>
      <Modal
        visible={showExpiryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExpiryPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select expiry</Text>
            <Text style={styles.modalLabel}>Month</Text>
            <View style={styles.optionWrap}>
              {monthOptions.map((m) => (
                <Pressable
                  key={`m-${m.value}`}
                  style={[
                    styles.optionChip,
                    selectedMonth === m.value && styles.optionChipActive,
                  ]}
                  onPress={() => setSelectedMonth(m.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedMonth === m.value && styles.optionTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.modalLabel}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScroll}
            >
              {yearOptions.map((year) => (
                <Pressable
                  key={`y-${year}`}
                  style={[
                    styles.optionChip,
                    selectedYear === year && styles.optionChipActive,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedYear === year && styles.optionTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setShowExpiryPicker(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.applyBtn]}
                onPress={applyExpirySelection}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputInner: {
    flex: 1,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  modalLabel: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 6,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearScroll: {
    gap: 8,
    paddingRight: 6,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontFamily: 'PublicSans_500Medium',
    color: COLORS.textPrimary,
  },
  optionTextActive: {
    color: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtn: {
    backgroundColor: COLORS.inputBg,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.textPrimary,
  },
  applyText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.white,
  },
});
