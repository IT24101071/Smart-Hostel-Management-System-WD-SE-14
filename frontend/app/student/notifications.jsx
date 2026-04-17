import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import {
  respondToPeerInvite,
  getBookingErrorMessage,
} from "../../services/booking.service";
import {
  getMyNotifications,
  getNotificationErrorMessage,
  markNotificationRead,
} from "../../services/notification.service";
import {
  getPeerInviteErrorMessage,
  respondToPreBookingInvite,
} from "../../services/peerInvite.service";

export default function StudentNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getMyNotifications();
      setItems(list);
    } catch (e) {
      setError(getNotificationErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/student");
  }, [router]);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } catch {
      // ignore non-critical read errors
    }
  }, []);

  const handlePeerAction = useCallback(
    async (notification, action) => {
      const preBookingInviteId = notification.meta?.peerInviteId;
      if (!notification.booking && !preBookingInviteId) {
        Alert.alert("Unavailable", "This invitation is no longer available.");
        return;
      }
      setActioningId(notification.id);
      try {
        if (preBookingInviteId) {
          await respondToPreBookingInvite(preBookingInviteId, action);
        } else {
          await respondToPeerInvite(notification.booking, action);
        }
        await markRead(notification.id);
        Alert.alert(
          action === "accept" ? "Accepted" : "Rejected",
          action === "accept"
            ? "You accepted this room invitation."
            : "You rejected this room invitation.",
        );
        await loadNotifications();
      } catch (e) {
        Alert.alert(
          "Action failed",
          preBookingInviteId ? getPeerInviteErrorMessage(e) : getBookingErrorMessage(e),
        );
      } finally {
        setActioningId("");
      }
    },
    [loadNotifications, markRead],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.helper}>Loading notifications…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadNotifications}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          ) : (
            items.map((notification) => {
              const isPeerInvite =
                notification.type === "peer_booking_invite" &&
                !notification.read &&
                Boolean(notification.booking || notification.meta?.peerInviteId);
              const isBusy = actioningId === notification.id;
              return (
                <View
                  key={notification.id}
                  style={[styles.card, !notification.read && styles.cardUnread]}
                >
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>

                  {isPeerInvite ? (
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handlePeerAction(notification, "reject")}
                        disabled={isBusy}
                      >
                        <Text style={styles.rejectText}>Reject</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handlePeerAction(notification, "accept")}
                        disabled={isBusy}
                      >
                        <Text style={styles.acceptText}>
                          {isBusy ? "Please wait..." : "Accept"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : !notification.read ? (
                    <Pressable
                      style={styles.markReadBtn}
                      onPress={() => markRead(notification.id)}
                    >
                      <Text style={styles.markReadText}>Mark as read</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function formatTimeAgo(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  helper: {
    marginTop: 10,
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textMuted,
  },
  errorText: {
    fontFamily: "PublicSans_500Medium",
    color: COLORS.maintenance,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryText: {
    color: COLORS.white,
    fontFamily: "PublicSans_600SemiBold",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  cardUnread: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  message: {
    marginTop: 6,
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  time: {
    marginTop: 8,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: COLORS.maintenanceBg,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
  },
  rejectText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.maintenance,
  },
  acceptText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.white,
  },
  markReadBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markReadText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.primary,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "PublicSans_500Medium",
    color: COLORS.textMuted,
  },
});
