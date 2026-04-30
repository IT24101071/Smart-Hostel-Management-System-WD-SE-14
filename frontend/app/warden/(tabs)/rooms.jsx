import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";
import { getRoomErrorMessage, getRooms } from "../../../services/room.service";
import {
  getRoomStudents,
  getVisitorErrorMessage,
} from "../../../services/visitor.service";

export default function WardenRoomsScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomStudents, setRoomStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  const loadRooms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { rooms: list } = await getRooms({ page: 1, limit: 300 });
      setRooms(Array.isArray(list) ? list : []);
    } catch (error) {
      Alert.alert("Rooms", getRoomErrorMessage(error));
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!searchText.trim() && searchQuery) {
      setSearchQuery("");
    }
  }, [searchText, searchQuery]);

  const visibleRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const roomNo = String(room?.roomNumber || "").toLowerCase();
      const roomType = String(room?.roomType || "").toLowerCase();
      const gender = String(room?.gender || "").toLowerCase();
      return roomNo.includes(q) || roomType.includes(q) || gender.includes(q);
    });
  }, [rooms, searchQuery]);

  function applySearch() {
    setSearchQuery(searchText.trim());
  }

  function handleSearchTextChange(value) {
    setSearchText(value);
    setSearchQuery(value.trim());
  }

  async function openRoomDetails(room) {
    setSelectedRoom(room);
    setStudentsLoading(true);
    try {
      const students = await getRoomStudents(room?.roomNumber);
      setRoomStudents(students);
    } catch (error) {
      setRoomStudents([]);
      Alert.alert("Room Members", getVisitorErrorMessage(error));
    } finally {
      setStudentsLoading(false);
    }
  }

  function closeRoomDetails() {
    setSelectedRoom(null);
    setRoomStudents([]);
    setStudentsLoading(false);
  }

  function renderRoomCard({ item }) {
    const occupancy = Number(item?.currentOccupancy || 0);
    const capacity = Number(item?.capacity || 0);
    const images = Array.isArray(item?.images) ? item.images.filter(Boolean) : [];
    return (
      <Pressable style={styles.roomCard} onPress={() => openRoomDetails(item)}>
        <View style={styles.roomTopRow}>
          <Text style={styles.roomNumber}>Room {item.roomNumber || "N/A"}</Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {item?.availabilityStatus || "Unknown"}
            </Text>
          </View>
        </View>
        <Text style={styles.roomMeta}>
          {item?.roomType || "N/A"} · {String(item?.gender || "N/A").toUpperCase()}
        </Text>
        <Text style={styles.roomMeta}>
          Occupancy: {occupancy}/{capacity} · LKR {Number(item?.pricePerMonth || 0).toLocaleString()}/month
        </Text>
        <View style={styles.thumbRow}>
          {images.length ? (
            images.slice(0, 5).map((uri, index) => (
              <Image
                key={`${item.id}-img-${index}`}
                source={{ uri }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={styles.thumbEmpty}>
              <Ionicons name="image-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.thumbEmptyText}>No images</Text>
            </View>
          )}
        </View>
        <Text style={styles.roomHint}>Tap to view members and details</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <WardenAppBar
        title="Warden Dashboard"
        subtitle="Smart Hostel Management"
        onLogout={handleLogout}
      />
      <WardenSubHeader title="Room Management" subtitle="Review room operations" />
      <View style={styles.content}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchTextChange}
            placeholder="Search room no, type or gender"
            returnKeyType="search"
            onSubmitEditing={applySearch}
          />
          <Pressable style={styles.searchBtn} onPress={applySearch}>
            <Ionicons name="search" size={16} color={COLORS.white} />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleRooms}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRoomCard}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadRooms(true)}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="bed-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No rooms found.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Modal
        visible={Boolean(selectedRoom)}
        transparent
        animationType="slide"
        onRequestClose={closeRoomDetails}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Room {selectedRoom?.roomNumber || ""}
              </Text>
              <Pressable onPress={closeRoomDetails}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailsCard}>
                <Text style={styles.detailLine}>
                  Type: {selectedRoom?.roomType || "N/A"}
                </Text>
                <Text style={styles.detailLine}>
                  Gender: {String(selectedRoom?.gender || "N/A").toUpperCase()}
                </Text>
                <Text style={styles.detailLine}>
                  Availability: {selectedRoom?.availabilityStatus || "N/A"}
                </Text>
                <Text style={styles.detailLine}>
                  Occupancy: {Number(selectedRoom?.currentOccupancy || 0)}/
                  {Number(selectedRoom?.capacity || 0)}
                </Text>
                <Text style={styles.detailLine}>
                  Monthly Fee: LKR {Number(selectedRoom?.pricePerMonth || 0).toLocaleString()}
                </Text>
                <Text style={styles.detailLine}>
                  Description: {selectedRoom?.description || "No description"}
                </Text>
              </View>

              <Text style={styles.memberHeading}>Members In This Room</Text>
              {studentsLoading ? (
                <View style={styles.memberLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : roomStudents.length ? (
                roomStudents.map((student) => (
                  <View key={String(student.id)} style={styles.memberCard}>
                    <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>{student.name || "Unnamed"}</Text>
                      <Text style={styles.memberSub}>
                        Student ID: {student.studentId || "N/A"}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noMembersText}>No students are currently assigned.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  roomCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  roomTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomNumber: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  statusChipText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  roomMeta: {
    marginTop: 6,
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  roomHint: {
    marginTop: 8,
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  thumbRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  thumbImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  thumbEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  thumbEmptyText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },
  emptyText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    minHeight: "65%",
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingBottom: 18,
  },
  detailsCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  detailLine: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  memberHeading: {
    marginTop: 14,
    marginBottom: 8,
    fontFamily: "PublicSans_700Bold",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  memberLoading: {
    paddingVertical: 18,
    alignItems: "center",
  },
  memberCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  memberSub: {
    marginTop: 2,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  noMembersText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
});
