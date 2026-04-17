import { createElement } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function BookingBottomBar({
  amount,
  subLabel = 'Per Month',
  onConfirm,
  disabled,
  disabledHint = '',
}) {
  const trimmedHint = disabledHint?.trim() ?? '';
  const showWebHoverHint =
    Platform.OS === 'web' && disabled && Boolean(trimmedHint);

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.label}>Total Deposit</Text>
        <Text style={styles.amount}>Rs. {Number(amount || 0).toLocaleString()}</Text>
        <Text style={styles.sub}>{subLabel}</Text>
      </View>
      <View style={styles.confirmOuter}>
        <Pressable
          style={[styles.btn, disabled && styles.btnDisabled]}
          onPress={onConfirm}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityHint={disabled && trimmedHint ? disabledHint : undefined}
        >
          <Text style={styles.btnText}>Confirm & Pay</Text>
        </Pressable>
        {showWebHoverHint
          ? createElement('span', {
              'aria-hidden': true,
              style: styles.webHoverShim,
              title: trimmedHint,
            })
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  amount: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  confirmOuter: {
    position: 'relative',
    borderRadius: 10,
    minWidth: 150,
    alignSelf: 'center',
  },
  webHoverShim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    borderRadius: 10,
    cursor: 'not-allowed',
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 150,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: COLORS.primary,
    opacity: 0.55,
  },
  btnText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.white,
  },
});
