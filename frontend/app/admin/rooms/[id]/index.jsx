import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader, {
  AdminSubHeaderIconButton,
} from "../../../../components/admin/AdminSubHeader";
import RoomDetailRow from "../../../../components/rooms/RoomDetailRow";
import { COLORS, STATUS_COLORS } from "../../../../constants/colors";
import {
  deleteRoom,
  getRoomById,
  getRoomErrorMessage,
} from "../../../../services/room.service";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxUri, setLightboxUri] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError("");
      try {
        const data = await getRoomById(id);
        setRoom(data);
      } catch (err) {
        setError(getRoomErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    if (id) fetch();
  }, [id]);

  function handleDelete() {
    if (!room) return;
    Alert.alert(
      "Delete Room",
      `Are you sure you want to delete Room ${room.roomNumber}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRoom(room.id);
              router.replace("/admin/rooms");
            } catch (err) {
              Alert.alert("Error", getRoomErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <AdminSubHeader title="Room Details" onBack={() => router.back()} />
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading room…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !room) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <AdminSubHeader title="Room Details" onBack={() => router.back()} />
        <View style={styles.centeredBox}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Failed to load room</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_COLORS[room.availabilityStatus];
  const occupancyPercent = Math.round(
    (room.currentOccupancy / room.capacity) * 100,
  );
  const bedsAvailable = room.capacity - room.currentOccupancy;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader
        title="Room Details"
        onBack={() => router.back()}
        rightElement={
          <AdminSubHeaderIconButton
            icon="pencil-outline"
            onPress={() => router.push(`/admin/rooms/${id}/edit`)}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconBox}>
              <Ionicons name="bed-outline" size={32} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.heroRoomNumber}>Room {room.roomNumber}</Text>
              <Text style={styles.heroRoomType}>{room.roomType} Room</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
              },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusStyle.text }]}
            />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {room.availabilityStatus}
            </Text>
          </View>
        </View>

        {/* Occupancy Card */}
        <View style={styles.occupancyCard}>
          <View style={styles.occupancyHeader}>
            <Text style={styles.occupancyTitle}>Occupancy</Text>
            <Text style={styles.occupancyCount}>
              {room.currentOccupancy}/{room.capacity}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(occupancyPercent, 100)}%`,
                  backgroundColor:
                    room.availabilityStatus === "Full"
                      ? COLORS.full
                      : room.availabilityStatus === "Maintenance"
                        ? COLORS.maintenance
                        : COLORS.available,
                },
              ]}
            />
          </View>
          <Text style={styles.occupancyLabel}>
            {occupancyPercent}% occupied · {bedsAvailable} bed
            {bedsAvailable !== 1 ? "s" : ""} available
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Room Information</Text>
          <RoomDetailRow
            icon="home-outline"
            label="Room Number"
            value={room.roomNumber}
          />
          <RoomDetailRow
            icon="layers-outline"
            label="Room Type"
            value={room.roomType}
          />
          <RoomDetailRow
            icon="cash-outline"
            label="Price Per Month"
            value={`Rs. ${room.pricePerMonth.toLocaleString()}`}
            valueColor={COLORS.primary}
          />
          <RoomDetailRow
            icon="people-outline"
            label="Capacity"
            value={`${room.capacity} person${room.capacity !== 1 ? "s" : ""}`}
          />
          <RoomDetailRow
            icon="person-outline"
            label="Current Occupancy"
            value={`${room.currentOccupancy} person${room.currentOccupancy !== 1 ? "s" : ""}`}
          />
          <RoomDetailRow
            icon="calendar-outline"
            label="Created"
            value={
              room.createdAt
                ? new Date(room.createdAt).toLocaleDateString()
                : "—"
            }
            noBorder
          />
        </View>

        {/* Description */}
        {room.description ? (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.infoCardTitle}>Description</Text>
            </View>
            <Text style={styles.infoCardText}>{room.description}</Text>
          </View>
        ) : null}

        {/* Images */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="images-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoCardTitle}>Room Images</Text>
            {room.images && room.images.length > 0 && (
              <Text style={styles.imageCount}>
                {room.images.length} photo{room.images.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>

          {room.images && room.images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageGallery}
            >
              {room.images.map((uri, i) => (
                <Pressable key={i} onPress={() => setLightboxUri(uri)}>
                  <Image
                    source={{ uri }}
                    style={styles.galleryThumb}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagesEmpty}>
              <Ionicons name="image-outline" size={36} color="#D1D5DB" />
              <Text style={styles.imagesEmptyText}>No images uploaded</Text>
            </View>
          )}
        </View>

        {/* Lightbox — full-screen image preview */}
        <Modal
          visible={!!lightboxUri}
          transparent
          animationType="fade"
          onRequestClose={() => setLightboxUri(null)}
        >
          <Pressable
            style={styles.lightboxBg}
            onPress={() => setLightboxUri(null)}
          >
            {lightboxUri && (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
            <Pressable
              style={styles.lightboxClose}
              onPress={() => setLightboxUri(null)}
              hitSlop={12}
            >
              <Ionicons name="close-circle" size={34} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </Modal>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.push(`/admin/rooms/${id}/edit`)}
          >
            <Ionicons name="pencil-outline" size={18} color={COLORS.white} />
            <Text style={styles.editButtonText}>Edit Room</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleDelete}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={COLORS.maintenance}
            />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  errorTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  errorSubtitle: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.white,
  },

  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRoomNumber: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  heroRoomType: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontFamily: "PublicSans_600SemiBold", fontSize: 12.5 },

  occupancyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  occupancyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  occupancyTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  occupancyCount: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: { height: "100%", borderRadius: 4, minWidth: 4 },
  occupancyLabel: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },

  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsCardTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  infoCardTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  infoCardText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  imageCount: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: "auto",
  },
  imageGallery: {
    gap: 10,
    paddingVertical: 4,
  },
  galleryThumb: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  imagesEmpty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  imagesEmptyText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  lightboxClose: {
    position: "absolute",
    top: 52,
    right: 20,
  },

  actionButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  editButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
  deleteButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.maintenanceBorder,
    backgroundColor: COLORS.maintenanceBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.maintenance,
  },
});
