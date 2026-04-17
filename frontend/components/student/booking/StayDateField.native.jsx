import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

function formatDate(date) {
  if (!date) return 'mm/dd/yyyy';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function toStartOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export default function StayDateField({ label, value, minimumDate, onSelectDate }) {
  const [showPicker, setShowPicker] = useState(false);

  function onChange(event, selectedDate) {
    setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onSelectDate(toStartOfDay(selectedDate));
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.inputWrap} onPress={() => setShowPicker(true)}>
        <Text style={[styles.input, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
        <View style={styles.iconWrap} accessibilityLabel={`${label} calendar`}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
        </View>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={value ?? minimumDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={onChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
