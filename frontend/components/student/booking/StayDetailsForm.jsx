import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';
import StayDateField from './StayDateField';

export default function StayDetailsForm({
  checkInDate,
  checkOutDate,
  onChangeCheckIn,
  onChangeCheckOut,
  errorMessage,
}) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const checkOutMinDate =
    checkInDate && checkInDate > today ? checkInDate : today;

  return (
    <View>
      <Text style={styles.heading}>Stay Details</Text>
      <StayDateField
        label="Check-In Date"
        value={checkInDate}
        minimumDate={today}
        onSelectDate={onChangeCheckIn}
      />
      <StayDateField
        label="Check-Out Date"
        value={checkOutDate}
        minimumDate={checkOutMinDate}
        onSelectDate={onChangeCheckOut}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  error: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.maintenance,
    marginTop: 2,
  },
});
