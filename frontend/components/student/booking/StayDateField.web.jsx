import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

function formatDate(date) {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseMmDdYyyy(raw) {
  const match = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function toStartOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export default function StayDateField({
  label,
  value,
  minimumDate,
  onSelectDate,
  disabled = false,
}) {
  const [text, setText] = useState(() => formatDate(value));

  useEffect(() => {
    setText(formatDate(value));
  }, [value]);

  function commit(raw) {
    const parsed = parseMmDdYyyy(raw);
    if (!parsed) {
      setText(formatDate(value));
      return;
    }
    const min = toStartOfDay(minimumDate);
    if (parsed < min) {
      onSelectDate(min);
      setText(formatDate(min));
      return;
    }
    onSelectDate(parsed);
    setText(formatDate(parsed));
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => commit(text)}
          placeholder="mm/dd/yyyy"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          autoCapitalize="none"
          editable={!disabled}
        />
        <View style={styles.iconWrap} accessibilityLabel={`${label} calendar`}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
        </View>
      </View>
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
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
