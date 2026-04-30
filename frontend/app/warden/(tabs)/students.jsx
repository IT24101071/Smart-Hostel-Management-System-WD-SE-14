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
import {
  deleteStudent,
  getStudentList,
  getWardenStaffErrorMessage,
} from "../../../services/warden.service";

export default function WardenStudentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadStudents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { users } = await getStudentList({ q: query, page: 1, limit: 200 });
      setStudents(users);
    } catch (error) {
      Alert.alert("Students", getWardenStaffErrorMessage(error));
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!searchText.trim() && query) {
      setQuery("");
    }
  }, [searchText, query]);

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  function handleSearch() {
    setQuery(searchText.trim());
  }

  function handleSearchTextChange(value) {
    setSearchText(value);
    setQuery(value.trim());
  }

  function confirmDelete(student) {
    Alert.alert(
      "Delete Student",
      `Remove ${student?.name || "this student"} from the portal? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(student.id);
              await deleteStudent(student.id);
              setStudents((prev) => prev.filter((item) => item.id !== student.id));
              Alert.alert("Deleted", "Student account removed successfully.");
            } catch (error) {
              Alert.alert("Delete failed", getWardenStaffErrorMessage(error));
            } finally {
              setDeletingId("");
            }
          },
        },
      ],
    );
  }

  const renderItem = ({ item }) => {
    const busy = deletingId === item.id;
    return (
      <View style={styles.studentCard}>
        <Pressable style={styles.studentHead} onPress={() => setSelectedStudent(item)}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.studentMeta}>
            <Text style={styles.studentName}>{item.name || "Unnamed Student"}</Text>
            <Text style={styles.studentEmail}>{item.email || "No email"}</Text>
            <Text style={styles.studentSubline}>
              Student ID: {item.studentId || "N/A"} · {item.isApproved ? "Approved" : "Pending"}
            </Text>
            <Text style={styles.viewDetailsText}>Tap to view member details</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.deleteBtn, busy && styles.deleteBtnDisabled]}
          onPress={() => confirmDelete(item)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={14} color={COLORS.white} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <WardenAppBar
        title="Warden Dashboard"
        subtitle="Smart Hostel Management"
        onLogout={handleLogout}
      />
      <WardenSubHeader title="Student Management" subtitle="Review student records" />
      <View style={styles.content}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchTextChange}
            placeholder="Search by name, email or student ID"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={16} color={COLORS.white} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadStudents(true)}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="school-outline" size={34} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No students found for the current filter.</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Modal
        visible={Boolean(selectedStudent)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStudent(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <Pressable onPress={() => setSelectedStudent(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailCard}>
                <Text style={styles.detailRow}>
                  Name: {selectedStudent?.name || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Email: {selectedStudent?.email || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Student ID: {selectedStudent?.studentId || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Contact: {selectedStudent?.contactNo || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Gender: {selectedStudent?.gender || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Year / Semester: {selectedStudent?.year || "N/A"} / {selectedStudent?.semester || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Guardian: {selectedStudent?.guardianName || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Guardian Contact: {selectedStudent?.guardianContact || "N/A"}
                </Text>
                <Text style={styles.detailRow}>
                  Status: {selectedStudent?.isApproved ? "Approved" : "Pending"}
                </Text>
                <Text style={styles.detailRow}>
                  Joined: {selectedStudent?.createdAt ? new Date(selectedStudent.createdAt).toLocaleString() : "N/A"}
                </Text>
              </View>
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
    gap: 10,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  studentHead: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  studentEmail: {
    marginTop: 1,
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  studentSubline: {
    marginTop: 3,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewDetailsText: {
    marginTop: 5,
    fontFamily: "PublicSans_500Medium",
    fontSize: 11,
    color: COLORS.primary,
  },
  deleteBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: COLORS.maintenance,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteBtnDisabled: {
    opacity: 0.7,
  },
  deleteBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.white,
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
    minHeight: "58%",
    maxHeight: "90%",
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
  detailCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
