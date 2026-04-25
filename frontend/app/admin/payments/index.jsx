import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../../components/admin/adminSubHeader";
import { COLORS } from "../../../constants/colors";
import { API_BASE_URL } from "../../../constants/api";
import {
  getAllPayments,
  getPendingPayments,
  getPaymentStats,
  getPaymentsByStatus,
  confirmPayment,
  rejectPayment,
} from "../../../services/payment.service";

const TABS = [
  { key: "pending", label: "Pending Verification" },
  { key: "all", label: "All Payments" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatCurrency(amount) {
  if (!amount) return "Rs. 0";
  return `Rs. ${Number(amount).toLocaleString()}`;
}

function getStatusColor(status) {
  switch (status) {
    case "pending":
      return "#F59E0B";
    case "submitted":
      return "#3B82F6";
    case "confirmed":
      return "#8B5CF6";
    case "completed":
      return "#10B981";
    case "failed":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "Pending";
    case "submitted":
      return "Submitted";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function getFullUrl(path) {
  if (!path) return null;
  const base = API_BASE_URL.replace(/\/api$/, "");
  return `${base}${path}`;
}

export default function PaymentManagement() {
  const router = useRouter();
  const [tab, setTab] = useState("pending");
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      let response;
      if (tab === "pending") {
        response = await getPendingPayments();
      } else if (tab === "all") {
        response = await getAllPayments();
      } else {
        response = await getPaymentsByStatus(tab);
      }
      setPayments(response.data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
      setPayments([]);
    }
  }, [tab]);

  const loadStats = useCallback(async () => {
    try {
      const response = await getPaymentStats();
      setStats(response.data || {});
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadPayments(), loadStats()]);
  }, [loadPayments, loadStats]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadAll();
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } catch {
      // Silent fail
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPayment) return;
    console.log("[ADMIN] Confirming payment:", selectedPayment._id);

    setActionLoading(true);
    try {
      const res = await confirmPayment(selectedPayment._id, {
        paymentStatus: "completed", // Move to completed after admin confirmation
        bookingStatus: "confirmed",
      });
      console.log("[ADMIN] Confirm Success:", res);
      Alert.alert("Success", "Payment confirmed successfully");
      setModalVisible(false);
      await loadAll();
    } catch (error) {
      console.error("[ADMIN] Confirm Error:", error);
      Alert.alert("Error", error.message || "Failed to confirm payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    console.log("[ADMIN] Rejecting payment:", selectedPayment._id);

    setActionLoading(true);
    try {
      const res = await rejectPayment(
        selectedPayment._id,
        "Payment rejected by admin",
      );
      console.log("[ADMIN] Reject Success:", res);
      Alert.alert("Success", "Payment rejected");
      setModalVisible(false);
      await loadAll();
    } catch (error) {
      console.error("[ADMIN] Reject Error:", error);
      Alert.alert("Error", error.message || "Failed to reject payment");
    } finally {
      setActionLoading(false);
    }
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  const renderPaymentItem = ({ item }) => (
    <Pressable
      style={styles.paymentCard}
      onPress={() => openPaymentDetails(item)}
    >
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.studentName}>
            {item.student?.name || "Unknown Student"}
          </Text>
          <Text style={styles.roomInfo}>
            Room {item.room?.roomNumber || "—"} ({item.room?.type || "—"})
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.paymentStatus) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.paymentStatus) },
            ]}
          >
            {getStatusLabel(item.paymentStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Room Fees:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.roomFees)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Security Deposit:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.securityDeposit)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Due:</Text>
          <Text style={styles.detailValueBold}>
            {formatCurrency(item.totalDue)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount Paid:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.amountPaidByBooker)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentFooter}>
        <Text style={styles.dateText}>
          Booked: {formatDate(item.createdAt)}
        </Text>
        <Text style={styles.viewMoreText}>View Details →</Text>
      </View>
    </Pressable>
  );

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalBookings || 0}</Text>
        <Text style={styles.statLabel}>Total Bookings</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: "#F59E0B" }]}>
          {stats.pendingPayments || 0}
        </Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: "#10B981" }]}>
          {stats.completedPayments || 0}
        </Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: "#3B82F6" }]}>
          {formatCurrency(stats.totalRevenue)}
        </Text>
        <Text style={styles.statLabel}>Revenue</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader title="Payment Management" />

      {renderStatsCard()}

      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.tab, tab === item.key && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === item.key && styles.tabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item._id}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No payments found</Text>
            </View>
          }
        />
      )}

      {/* Payment Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
            </View>

            {selectedPayment && (
              <>
                <View style={{ flex: 1 }}> 
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Student Info</Text>
                    <Text style={styles.modalText}>
                      {selectedPayment.student?.name || "—"}
                    </Text>
                    <Text style={styles.modalSubText}>
                      {selectedPayment.student?.email || "—"}
                    </Text>
                    <Text style={styles.modalSubText}>
                      {selectedPayment.student?.phone || "—"}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Room Info</Text>
                    <Text style={styles.modalText}>
                      Room {selectedPayment.room?.roomNumber || "—"} -{" "}
                      {selectedPayment.room?.type || "—"}
                    </Text>
                    <Text style={styles.modalSubText}>
                      Gender: {selectedPayment.room?.gender || "—"}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Payment Info</Text>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Room Fees:</Text>
                      <Text style={styles.modalValue}>
                        {formatCurrency(selectedPayment.roomFees)}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Security Deposit:</Text>
                      <Text style={styles.modalValue}>
                        {formatCurrency(selectedPayment.securityDeposit)}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Total Due:</Text>
                      <Text style={styles.modalValueBold}>
                        {formatCurrency(selectedPayment.totalDue)}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Amount Paid:</Text>
                      <Text style={styles.modalValue}>
                        {formatCurrency(selectedPayment.amountPaidByBooker)}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Payment Method:</Text>
                      <Text style={styles.modalValue}>
                        {selectedPayment.paymentMethod?.toUpperCase() || "—"}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getStatusColor(selectedPayment.paymentStatus) +
                              "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: getStatusColor(
                                selectedPayment.paymentStatus,
                              ),
                            },
                          ]}
                        >
                          {getStatusLabel(selectedPayment.paymentStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedPayment.receipt && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Receipt Attachment</Text>
                      {selectedPayment.receipt.uri?.toLowerCase().endsWith(".pdf") ? (
                        <TouchableOpacity 
                          style={styles.pdfButton} 
                          onPress={() => Linking.openURL(getFullUrl(selectedPayment.receipt.uri))}
                        >
                          <Ionicons name="document-text" size={24} color={COLORS.primary} />
                          <Text style={styles.pdfButtonText}>Open PDF Receipt</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.receiptContainer}>
                          <Image
                            source={{ uri: getFullUrl(selectedPayment.receipt.uri) }}
                            style={styles.receiptImage}
                            resizeMode="contain"
                          />
                          <Text style={styles.receiptFileName}>
                            {selectedPayment.receipt.name}
                          </Text>
                          <TouchableOpacity 
                            style={styles.fullScreenLink}
                            onPress={() => Linking.openURL(getFullUrl(selectedPayment.receipt.uri))}
                          >
                            <Text style={styles.fullScreenLinkText}>View Full Screen</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>

              <View style={styles.modalActions}>
                  {selectedPayment.paymentStatus === "submitted" && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.rejectButton,
                          actionLoading && styles.buttonDisabled,
                        ]}
                        onPress={handleReject}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.confirmButton,
                          actionLoading && styles.buttonDisabled,
                        ]}
                        onPress={handleConfirm}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#374151",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  tabContainer: {
    marginTop: 16,
  },
  tabList: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  roomInfo: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#374151",
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paymentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  dateText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  viewMoreText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  modalSubText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalValue: {
    fontSize: 14,
    color: "#374151",
  },
  modalValueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  closeButton: {
    backgroundColor: "#6B7280",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  receiptContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiptImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  receiptFileName: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "PublicSans_400Regular",
  },
  fullScreenLink: {
    marginTop: 8,
    padding: 4,
  },
  fullScreenLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: "PublicSans_600SemiBold",
    textDecorationLine: "underline",
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pdfButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: "PublicSans_600SemiBold",
  },
});
