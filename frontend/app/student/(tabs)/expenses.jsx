import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Image, Modal, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { getMyBookings } from '../../../services/booking.service';
import { API_BASE_URL } from '../../../constants/api';

export default function StudentExpensesScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadExpenses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getMyBookings();
      setExpenses(data || []);
    } catch (e) {
      setError('Could not load expenses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  function getStatusColor(status) {
    if (status === 'completed') return COLORS.success;
    if (status === 'pending' || status === 'submitted') return COLORS.warning;
    if (status === 'failed' || status === 'cancelled') return COLORS.error;
    return COLORS.textMuted;
  }

  function getFullUrl(path) {
    if (!path) return null;
    const base = API_BASE_URL.replace(/\/api$/, "");
    return `${base}${path}`;
  }

  const openDetails = (expense) => {
    setSelectedExpense(expense);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={32} color={COLORS.primary} style={styles.headerIcon} />
        <Text style={styles.title}>My Expenses</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadExpenses(true)} tintColor={COLORS.primary} />}
      >
        {error !== '' ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {expenses.length === 0 && !error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
          </View>
        ) : (
          expenses.map((exp) => (
            <TouchableOpacity key={exp.id} style={styles.card} onPress={() => openDetails(exp)}>
              <View style={styles.cardTop}>
                <Text style={styles.roomText}>Room {exp.room?.roomNumber || 'Unknown'}</Text>
                <Text style={styles.amountText}>Rs. {exp.totalDue?.toLocaleString()}</Text>
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.dateText}>Check-in: {formatDate(exp.checkInDate)}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.methodText}>Via {exp.paymentMethod === 'bank' ? 'Bank Transfer' : 'Card'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(exp.paymentStatus) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(exp.paymentStatus) }]}>
                    {exp.paymentStatus?.toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedExpense && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Room</Text>
                  <Text style={styles.modalValue}>Room {selectedExpense.room?.roomNumber}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Stay Duration</Text>
                  <Text style={styles.modalValue}>{selectedExpense.stayDays} Days</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Total Amount</Text>
                  <Text style={styles.modalValueBold}>Rs. {selectedExpense.totalDue?.toLocaleString()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedExpense.paymentStatus) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedExpense.paymentStatus) }]}>
                      {selectedExpense.paymentStatus?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {selectedExpense.paymentMethod === 'bank' && selectedExpense.receipt && (
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptTitle}>Bank Receipt</Text>
                    {selectedExpense.receipt.uri?.toLowerCase().endsWith(".pdf") ? (
                      <TouchableOpacity 
                        style={styles.pdfButton} 
                        onPress={() => Linking.openURL(getFullUrl(selectedExpense.receipt.uri))}
                      >
                        <Ionicons name="document-text" size={32} color={COLORS.primary} />
                        <Text style={styles.pdfButtonText}>Open PDF Receipt</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.receiptContainer}>
                        <Image
                          source={{ uri: getFullUrl(selectedExpense.receipt.uri) }}
                          style={styles.receiptImage}
                          resizeMode="contain"
                        />
                        <TouchableOpacity 
                          style={styles.fullScreenLink}
                          onPress={() => Linking.openURL(getFullUrl(selectedExpense.receipt.uri))}
                        >
                          <Text style={styles.fullScreenLinkText}>View Full Screen</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'PublicSans_400Regular',
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    marginRight: 10,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: 'PublicSans_500Medium',
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.textMuted,
    fontFamily: 'PublicSans_500Medium',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  amountText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.primary,
  },
  cardMid: {
    marginBottom: 12,
  },
  dateText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
  },
  methodText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalValue: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalValueBold: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.primary,
  },
  receiptSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  receiptTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  receiptContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  fullScreenLink: {
    marginTop: 12,
  },
  fullScreenLinkText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  pdfButtonText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.primary,
  },
  closeModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 34,
  },
  closeModalBtnText: {
    fontFamily: 'PublicSans_700Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});
