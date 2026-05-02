import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
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
import { resolveUploadUrl } from "../../../constants/api";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";
import { getRoomErrorMessage, getRooms } from "../../../services/room.service";
import {
  getRoomStudents,
  getVisitorErrorMessage,
} from "../../../services/visitor.service";

function dash(value) {
  if (value === null || value === undefined) return "—";
  const s = String(value).trim();
  return s === "" ? "—" : s;
}

function formatGender(g) {
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  return dash(g);
}

function identityDocNumberLabel(docType) {
  if (docType === "passport") return "Passport number";
  if (docType === "nic") return "NIC number";
  return "Document number";
}

/** RN Image cannot render PDFs — detect by URL path so we show an open link instead. */
function isPdfDocumentUrl(pathOrUrl) {
  if (!pathOrUrl) return false;
  const path = String(pathOrUrl).split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".pdf");
}

async function openExternalDocument(url) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Cannot open", "This device cannot open this URL.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Error", "Could not open the document.");
  }
}

export default function WardenRoomsScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
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
    setSelectedMember(null);
    setSelectedRoom(null);
    setRoomStudents([]);
    setStudentsLoading(false);
  }

  function closeMemberModal() {
    setSelectedMember(null);
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
                  <Pressable
                    key={String(student.id)}
                    style={({ pressed }) => [
                      styles.memberCard,
                      pressed && styles.memberCardPressed,
                    ]}
                    onPress={() => setSelectedMember(student)}
                  >
                    <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>{student.name || "Unnamed"}</Text>
                      <Text style={styles.memberSub}>
                        Student ID: {student.studentId || "N/A"}
                      </Text>
                      <Text style={styles.memberTapHint}>Tap for full profile & NIC</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noMembersText}>No students are currently assigned.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedMember)}
        transparent
        animationType="slide"
        onRequestClose={closeMemberModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.memberDetailCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student profile</Text>
              <Pressable onPress={closeMemberModal}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            {selectedMember ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.memberDetailContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailsCard}>
                  <Text style={styles.detailLine}>Name: {dash(selectedMember.name)}</Text>
                  <Text style={styles.detailLine}>
                    Student ID: {dash(selectedMember.studentId)}
                  </Text>
                  <Text style={styles.detailLine}>Email: {dash(selectedMember.email)}</Text>
                  <Text style={styles.detailLine}>
                    Phone: {dash(selectedMember.contactNo)}
                  </Text>
                  <Text style={styles.detailLine}>
                    Gender: {formatGender(selectedMember.gender)}
                  </Text>
                  <Text style={styles.detailLine}>
                    Year / Semester:{" "}
                    {selectedMember.year != null || selectedMember.semester != null
                      ? `${selectedMember.year ?? "—"} / ${selectedMember.semester ?? "—"}`
                      : "—"}
                  </Text>
                  <Text style={styles.detailLine}>
                    Guardian: {dash(selectedMember.guardianName)}
                  </Text>
                  <Text style={styles.detailLine}>
                    Guardian contact: {dash(selectedMember.guardianContact)}
                  </Text>
                  <Text style={styles.detailLine}>Room: {dash(selectedMember.roomNumber)}</Text>
                </View>

                <Text style={styles.memberHeading}>
                  {selectedMember.identityDocumentType === "passport"
                    ? "Passport"
                    : selectedMember.identityDocumentType === "nic"
                      ? "NIC"
                      : "Identity document"}
                </Text>
                <View style={styles.detailsCard}>
                  <Text style={styles.detailLine}>
                    {identityDocNumberLabel(selectedMember.identityDocumentType)}:{" "}
                    {dash(selectedMember.nicNumber)}
                  </Text>
                  {(() => {
                    const rawPath = selectedMember.nicPhoto;
                    const docUrl = resolveUploadUrl(rawPath);
                    if (!docUrl) {
                      return (
                        <Text style={styles.noPhotoText}>
                          No identity document on file for this booking.
                        </Text>
                      );
                    }
                    const isPdf =
                      isPdfDocumentUrl(rawPath) || isPdfDocumentUrl(docUrl);
                    if (isPdf) {
                      return (
                        <Pressable
                          style={({ pressed }) => [
                            styles.pdfOpenBtn,
                            pressed && styles.pdfOpenBtnPressed,
                          ]}
                          onPress={() => openExternalDocument(docUrl)}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={22}
                            color={COLORS.primary}
                          />
                          <Text style={styles.pdfOpenBtnText}>
                            Open identity document (PDF)
                          </Text>
                          <Ionicons name="open-outline" size={18} color={COLORS.primary} />
                        </Pressable>
                      );
                    }
                    return (
                      <>
                        <Image
                          source={{ uri: docUrl }}
                          style={styles.nicPhoto}
                          resizeMode="contain"
                        />
                        <Pressable onPress={() => openExternalDocument(docUrl)}>
                          <Text style={styles.openDocLink}>Open full image in browser</Text>
                        </Pressable>
                      </>
                    );
                  })()}
                </View>

                {(resolveUploadUrl(selectedMember.profileImage) ||
                  resolveUploadUrl(selectedMember.idCardImage)) && (
                  <>
                    <Text style={styles.memberHeading}>Other documents</Text>
                    <View style={styles.optionalImagesRow}>
                      {resolveUploadUrl(selectedMember.profileImage) ? (
                        <View style={styles.optionalImageWrap}>
                          <Text style={styles.optionalImageLabel}>Profile</Text>
                          <Image
                            source={{ uri: resolveUploadUrl(selectedMember.profileImage) }}
                            style={styles.optionalImage}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                      {resolveUploadUrl(selectedMember.idCardImage) ? (
                        <View style={styles.optionalImageWrap}>
                          <Text style={styles.optionalImageLabel}>ID card</Text>
                          <Image
                            source={{ uri: resolveUploadUrl(selectedMember.idCardImage) }}
                            style={styles.optionalImage}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                    </View>
                  </>
                )}
              </ScrollView>
            ) : null}
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
  memberCardPressed: {
    opacity: 0.92,
    backgroundColor: COLORS.background,
  },
  memberMeta: {
    flex: 1,
  },
  memberTapHint: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.primary,
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
  memberDetailCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    minHeight: "55%",
    maxHeight: "92%",
  },
  memberDetailContent: {
    paddingBottom: 28,
    gap: 4,
  },
  nicPhoto: {
    marginTop: 10,
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pdfOpenBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  pdfOpenBtnPressed: {
    opacity: 0.88,
  },
  pdfOpenBtnText: {
    flex: 1,
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.primaryDark,
  },
  openDocLink: {
    marginTop: 10,
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  noPhotoText: {
    marginTop: 8,
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  optionalImagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  optionalImageWrap: {
    gap: 6,
  },
  optionalImageLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  optionalImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
});
