import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BANK_TRANSFER_DETAILS } from '../../../constants/paymentBank';
import { COLORS } from '../../../constants/colors';

async function copyLine(label, value) {
  try {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  } catch {
    Alert.alert('Copy failed', 'Could not copy to clipboard.');
  }
}

export default function BankTransferDetails() {
  const { bankName, accountName, accountNumber } = BANK_TRANSFER_DETAILS;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Transfer Details</Text>
      <Text style={styles.bankName}>{bankName}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Account Name</Text>
            <Text style={styles.rowValue}>{accountName}</Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => copyLine('Account name', accountName)}
            accessibilityLabel="Copy account name"
          >
            <Ionicons name="copy-outline" size={22} color={COLORS.primary} />
          </Pressable>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Account Number</Text>
            <Text style={styles.rowValue}>{accountNumber}</Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => copyLine('Account number', accountNumber)}
            accessibilityLabel="Copy account number"
          >
            <Ionicons name="copy-outline" size={22} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>
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
    marginBottom: 8,
  },
  bankName: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  rowValue: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
});
