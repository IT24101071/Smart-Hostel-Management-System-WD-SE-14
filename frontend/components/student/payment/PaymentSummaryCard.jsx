import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

function formatRs(n) {
  return `Rs. ${Number(n || 0).toLocaleString()}`;
}

export default function PaymentSummaryCard({
  total,
  deposit,
  roomFees,
  payableNow,
  splitMode,
}) {
  const isSplit = splitMode === 'split';
  return (
    <View style={styles.card}>
      <Text style={styles.totalLabel}>{isSplit ? 'Payable Now' : 'Total Due'}</Text>
      <Text style={styles.totalValue}>{formatRs(isSplit ? payableNow : total)}</Text>
      <View style={styles.divider} />
      {isSplit ? (
        <>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Your Half</Text>
            <Text style={styles.rowValue}>{formatRs(payableNow)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Peer Half (Pending)</Text>
            <Text style={styles.rowValue}>{formatRs(total - payableNow)}</Text>
          </View>
        </>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Security Deposit</Text>
        <Text style={styles.rowValue}>{formatRs(deposit)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Room Fees</Text>
        <Text style={styles.rowValue}>{formatRs(roomFees)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  totalLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  totalValue: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 26,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});
