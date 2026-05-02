import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../components/admin/AdminSubHeader";
import { COLORS } from "../../constants/colors";
import { resolveUploadUrl } from "../../constants/api";
import {
  cancelBookingAsAdmin,
  getAllBookingsForAdmin,
  getAdminErrorMessage,
} from "../../services/admin.service";
import { ROOM_GENDER_LABELS } from "../../types/room";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatCurrency(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "Rs. 0";
  return `Rs. ${Number(amount).toLocaleString()}`;
}

function getBookingId(booking) {
  if (!booking) return null;
  const raw = booking._id ?? booking.id;
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    return String(raw.$oid);
  }
  return String(raw);
}

function startOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function canAdminCancelBooking(booking) {
  if (!booking || booking.bookingStatus === "cancelled") return false;
  const checkInDay = startOfDayLocal(booking.checkInDate);
  const today = startOfDayLocal(new Date());
  return checkInDay.getTime() > today.getTime();
}

function identityTypeLabel(t) {
  if (t === "nic") return "NIC";
  if (t === "passport") return "Passport";
  return "—";
}

function paymentStatusColor(status) {
  switch (status) {
    case "completed":
      return "#10B981";
    case "confirmed":
      return "#8B5CF6";
    case "submitted":
      return "#3B82F6";
    case "pending":
      return "#F59E0B";
    case "failed":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

function bookingStatusColor(status) {
  switch (status) {
    case "confirmed":
      return "#10B981";
    case "pending":
      return "#F59E0B";
    case "cancelled":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

export default function AdminBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const loadBookings = useCallback(async () => {
    const response = await getAllBookingsForAdmin();
    const list = Array.isArray(response?.data) ? response.data : [];
    setBookings(list);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadBookings();
      } catch (e) {
        Alert.alert("Error", getAdminErrorMessage(e));
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBookings();
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/admin");
  };

  const confirmCancel = (booking) => {
    const id = getBookingId(booking);
    if (!id) return;

    const studentName = booking.student?.name ?? "Student";
    const message = `Cancel booking for ${studentName}? This cannot be undone.`;

    const run = async () => {
      setActionId(id);
      try {
        await cancelBookingAsAdmin(id);
        Alert.alert("Success", "Booking cancelled.");
        await loadBookings();
      } catch (e) {
        Alert.alert("Could not cancel", getAdminErrorMessage(e));
      } finally {
        setActionId(null);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) run();
      return;
    }

    Alert.alert("Cancel booking", message, [
      { text: "No", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: run },
    ]);
  };

  const openDocument = async (booking) => {
    const url = resolveUploadUrl(booking.identityDocumentImageUrl);
    if (!url) {
      Alert.alert("No document", "No identity document URL on file.");
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Cannot open", url);
      return;
    }
    await Linking.openURL(url);
  };

  const renderItem = ({ item }) => {
    const room = item.room ?? {};
    const student = item.student ?? {};
    const id = getBookingId(item);
    const showCancel = canAdminCancelBooking(item);
    const busy = actionId === id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.studentName}>{student.name ?? "—"}</Text>
          <Text style={styles.studentEmail}>{student.email ?? "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Room</Text>
          <Text style={styles.value}>
            {room.roomNumber ?? "—"} · {room.roomType ?? "—"} ·{" "}
            {ROOM_GENDER_LABELS[room.gender] ?? room.gender ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Stay</Text>
          <Text style={styles.value}>
            {formatDate(item.checkInDate)} → {formatDate(item.checkOutDate)} (
            {item.stayDays ?? "—"} days)
          </Text>
        </View>

        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              { borderColor: bookingStatusColor(item.bookingStatus) },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: bookingStatusColor(item.bookingStatus) },
              ]}
            >
              Booking: {item.bookingStatus ?? "—"}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { borderColor: paymentStatusColor(item.paymentStatus) },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: paymentStatusColor(item.paymentStatus) },
              ]}
            >
              Payment: {item.paymentStatus ?? "—"}
            </Text>
          </View>
        </View>

        <View style={styles.amounts}>
          <Text style={styles.amountLine}>
            Room fees: {formatCurrency(item.roomFees)}
          </Text>
          <Text style={styles.amountLine}>
            Deposit: {formatCurrency(item.securityDeposit)}
          </Text>
          <Text style={styles.amountLine}>
            Total due: {formatCurrency(item.totalDue)}
          </Text>
          <Text style={styles.amountLine}>
            Paid: {formatCurrency(item.amountPaidByBooker)}
          </Text>
        </View>

        <View style={styles.identityBlock}>
          <Text style={styles.identityTitle}>Identity</Text>
          <Text style={styles.identityLine}>
            {identityTypeLabel(item.identityDocumentType)} ·{" "}
            {item.identityDocumentNumber?.trim() || "—"}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.docButton,
              pressed && styles.docButtonPressed,
              !item.identityDocumentImageUrl && styles.docButtonDisabled,
            ]}
            onPress={() => openDocument(item)}
            disabled={!item.identityDocumentImageUrl}
          >
            <Ionicons name="document-text-outline" size={18} color="#0369A1" />
            <Text style={styles.docButtonText}>Open document</Text>
          </Pressable>
        </View>

        {showCancel ? (
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && styles.cancelBtnPressed,
              busy && styles.cancelBtnDisabled,
            ]}
            onPress={() => confirmCancel(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#B91C1C" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.cancelBtnText}>Cancel booking (admin)</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Text style={styles.cancelHint}>
            {item.bookingStatus === "cancelled"
              ? "Already cancelled."
              : "Cancel unavailable: check-in is today or in the past."}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader
        title="Booking Management"
        subtitle="All student bookings, identity verification & admin cancellation"
        onBack={handleBack}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) =>
            getBookingId(item) ?? `booking-row-${index}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No bookings found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  empty: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
    marginBottom: 4,
  },
  studentName: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  studentEmail: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  row: {
    gap: 2,
  },
  label: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
  },
  amounts: {
    marginTop: 4,
    gap: 4,
  },
  amountLine: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  identityBlock: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  identityTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  identityLine: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary ?? COLORS.textMuted,
  },
  docButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  docButtonPressed: {
    opacity: 0.88,
  },
  docButtonDisabled: {
    opacity: 0.45,
  },
  docButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: "#0369A1",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  cancelBtnPressed: {
    opacity: 0.9,
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: "#B91C1C",
  },
  cancelHint: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: "italic",
  },
});
