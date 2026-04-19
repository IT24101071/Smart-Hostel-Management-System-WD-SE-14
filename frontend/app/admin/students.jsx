import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../components/admin/AdminSubHeader";
import { COLORS } from "../../constants/colors";
import apiClient from "../../lib/axios";
import { ROOM_GENDERS, ROOM_GENDER_LABELS } from "../../types/room";

const TABS = [
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Approved students" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function getUserRecordId(user) {
  if (!user) return null;
  const raw = user._id ?? user.id;
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    return String(raw.$oid);
  }
  return String(raw);
}

function formatGender(g) {
  if (g === "male") return ROOM_GENDER_LABELS.male;
  if (g === "female") return ROOM_GENDER_LABELS.female;
  return "—";
}

export default function StudentManagement() {
  const router = useRouter();
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalUser, setModalUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadPending = useCallback(async () => {
    const { data } = await apiClient.get("/auth/pending");
    setPending(Array.isArray(data) ? data : []);
  }, []);

  const loadApproved = useCallback(async () => {
    const { data } = await apiClient.get("/auth/students/approved");
    setApproved(Array.isArray(data) ? data : []);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadPending(), loadApproved()]);
  }, [loadPending, loadApproved]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadAll();
      } catch {
        Alert.alert("Error", "Failed to load students");
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
      Alert.alert("Error", "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  function openModal(user, opts = {}) {
    const wantEdit = opts.edit === true;
    setModalUser(user);
    setEditing(wantEdit);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      studentId: user.studentId ?? "",
      gender:
        user.gender === "female"
          ? "female"
          : user.gender === "male"
            ? "male"
            : "male",
      year: user.year != null ? String(user.year) : "",
      semester: user.semester != null ? String(user.semester) : "",
      contactNo: user.contactNo ?? "",
      guardianName: user.guardianName ?? "",
      guardianContact: user.guardianContact ?? "",
      password: "",
    });
  }

  const closeModal = () => {
    setModalUser(null);
    setEditing(false);
    setEditForm({});
  };

  const handleApprove = async (userOrId) => {
    const id =
      typeof userOrId === "string" ? userOrId : getUserRecordId(userOrId);
    if (!id) {
      Alert.alert("Error", "Missing student id.");
      return;
    }
    try {
      await apiClient.patch(`/auth/approve/${encodeURIComponent(id)}`);
      Alert.alert("Success", "Student approved");
      closeModal();
      await loadAll();
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to approve student",
      );
    }
  };

  const handleDelete = (user, label) => {
    const id = getUserRecordId(user);
    if (!id) {
      Alert.alert(
        "Error",
        "Missing student id. Close this window and open the student again.",
      );
      return;
    }

    const message = `Remove ${label || "this student"} permanently?`;

    const executeDelete = async () => {
      try {
        await apiClient.delete(`/auth/users/${encodeURIComponent(id)}`);
        Alert.alert("Success", "Student deleted");
        closeModal();
        await loadAll();
      } catch (e) {
        Alert.alert(
          "Error",
          e?.response?.data?.message || "Failed to delete student",
        );
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) executeDelete();
      return;
    }

    Alert.alert("Delete student", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: executeDelete,
      },
    ]);
  };

  const handleSaveEdit = async () => {
    const recordId = getUserRecordId(modalUser);
    if (!recordId) return;
    if (!editForm.name?.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        studentId: editForm.studentId.trim(),
        year: editForm.year ? parseInt(editForm.year, 10) : undefined,
        semester: editForm.semester
          ? parseInt(editForm.semester, 10)
          : undefined,
        contactNo: editForm.contactNo.trim(),
        guardianName: editForm.guardianName.trim(),
        guardianContact: editForm.guardianContact.trim(),
      };
      if (editForm.gender === "male" || editForm.gender === "female") {
        payload.gender = editForm.gender;
      }
      if (editForm.password?.trim()) {
        payload.password = editForm.password.trim();
      }
      const { data } = await apiClient.patch(
        `/auth/users/${encodeURIComponent(recordId)}`,
        payload,
      );
      const updated = data.user || data;
      Alert.alert("Success", "Student updated");
      setModalUser({
        ...updated,
        _id: getUserRecordId(updated) ?? recordId,
      });
      setEditing(false);
      await loadApproved();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to update student";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const list = tab === "pending" ? pending : approved;

  const renderCard = ({ item }) => (
    <View style={styles.studentCard}>
      <Pressable
        style={styles.studentRow}
        onPress={() => openModal(item, { edit: false })}
      >
        <View style={styles.avatar}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatarImg}
            />
          ) : (
            <Ionicons name="person" size={22} color={COLORS.primary} />
          )}
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
          <Text style={styles.studentId}>ID: {item.studentId || "—"}</Text>
          <Text style={styles.studentGender}>
            Gender: {formatGender(item.gender)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </Pressable>
      {tab === "pending" && (
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.chip, styles.chipApprove]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.chipApproveText}>Approve</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderDetailModal = () => {
    if (!modalUser) return null;
    const isPendingTab = tab === "pending";
    const showEdit = !isPendingTab && editing;

    return (
      <Modal
        visible
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isPendingTab ? "Review student" : "Student profile"}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={26} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.imageRow}>
                {modalUser.profileImage ? (
                  <View style={styles.docBox}>
                    <Text style={styles.docLabel}>Profile</Text>
                    <Image
                      source={{ uri: modalUser.profileImage }}
                      style={styles.docImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
                {modalUser.idCardImage ? (
                  <View style={styles.docBox}>
                    <Text style={styles.docLabel}>ID card</Text>
                    <Image
                      source={{ uri: modalUser.idCardImage }}
                      style={styles.docImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>

              {showEdit ? (
                <>
                  <FieldEdit
                    label="Full name"
                    value={editForm.name}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, name: t }))
                    }
                  />
                  <FieldEdit
                    label="Email"
                    value={editForm.email}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, email: t }))
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <FieldEdit
                    label="Student ID"
                    value={editForm.studentId}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, studentId: t }))
                    }
                  />
                  <GenderEditRow
                    value={editForm.gender}
                    onChange={(g) =>
                      setEditForm((f) => ({ ...f, gender: g }))
                    }
                  />
                  <FieldEdit
                    label="Year"
                    value={editForm.year}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, year: t }))
                    }
                    keyboardType="numeric"
                  />
                  <FieldEdit
                    label="Semester"
                    value={editForm.semester}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, semester: t }))
                    }
                    keyboardType="numeric"
                  />
                  <FieldEdit
                    label="Contact no."
                    value={editForm.contactNo}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, contactNo: t }))
                    }
                    keyboardType="phone-pad"
                  />
                  <FieldEdit
                    label="Guardian name"
                    value={editForm.guardianName}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, guardianName: t }))
                    }
                  />
                  <FieldEdit
                    label="Guardian contact"
                    value={editForm.guardianContact}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, guardianContact: t }))
                    }
                    keyboardType="phone-pad"
                  />
                  <FieldEdit
                    label="New password (optional)"
                    value={editForm.password}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, password: t }))
                    }
                    secureTextEntry
                    placeholder="Leave blank to keep current"
                  />
                </>
              ) : (
                <>
                  <DetailRow label="Name" value={modalUser.name} />
                  <DetailRow label="Email" value={modalUser.email} />
                  <DetailRow label="Student ID" value={modalUser.studentId} />
                  <DetailRow
                    label="Gender"
                    value={formatGender(modalUser.gender)}
                  />
                  <DetailRow
                    label="Year / Semester"
                    value={`${modalUser.year ?? "—"} / ${modalUser.semester ?? "—"}`}
                  />
                  <DetailRow label="Contact" value={modalUser.contactNo} />
                  <DetailRow label="Guardian" value={modalUser.guardianName} />
                  <DetailRow
                    label="Guardian contact"
                    value={modalUser.guardianContact}
                  />
                  <DetailRow
                    label="Registered"
                    value={formatDate(modalUser.createdAt)}
                  />
                  <DetailRow
                    label="Status"
                    value={modalUser.isApproved ? "Approved" : "Pending"}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {isPendingTab ? (
                <>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnDanger]}
                    onPress={() => handleDelete(modalUser, modalUser.name)}
                  >
                    <Text style={styles.modalBtnDangerText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={() => handleApprove(modalUser)}
                  >
                    <Text style={styles.modalBtnPrimaryText}>Approve</Text>
                  </Pressable>
                </>
              ) : showEdit ? (
                <>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                    onPress={() => {
                      setEditing(false);
                      openModal(modalUser, { edit: false });
                    }}
                  >
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalBtn,
                      styles.modalBtnPrimary,
                      saving && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalBtnPrimaryText}>Save</Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnDanger]}
                    onPress={() => handleDelete(modalUser, modalUser.name)}
                  >
                    <Text style={styles.modalBtnDangerText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnGhost]}
                    onPress={() => setEditing(true)}
                  >
                    <Text style={styles.modalBtnGhostText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={closeModal}
                  >
                    <Text style={styles.modalBtnPrimaryText}>Done</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader
        title="Student management"
        subtitle={
          tab === "pending"
            ? `${pending.length} awaiting approval`
            : `${approved.length} approved`
        }
        onBack={() => router.back()}
      />

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={list}
        renderItem={renderCard}
        keyExtractor={(item, index) =>
          getUserRecordId(item) ?? `${item.email ?? "student"}-${index}`
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                tab === "pending" ? "checkmark-done-outline" : "people-outline"
              }
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>
              {tab === "pending"
                ? "No students waiting for approval"
                : "No approved students yet"}
            </Text>
          </View>
        }
      />

      {renderDetailModal()}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? "—"}</Text>
    </View>
  );
}

function FieldEdit({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  placeholder,
}) {
  return (
    <View style={styles.fieldEdit}>
      <Text style={styles.fieldEditLabel}>{label}</Text>
      <TextInput
        style={styles.fieldEditInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

function GenderEditRow({ value, onChange }) {
  return (
    <View style={styles.fieldEdit}>
      <Text style={styles.fieldEditLabel}>Gender</Text>
      <View style={styles.genderEditRow}>
        {ROOM_GENDERS.map((g) => {
          const selected = value === g;
          return (
            <Pressable
              key={g}
              onPress={() => onChange(g)}
              style={[
                styles.genderEditChip,
                selected && styles.genderEditChipActive,
              ]}
            >
              <Text
                style={[
                  styles.genderEditChipText,
                  selected && styles.genderEditChipTextActive,
                ]}
              >
                {ROOM_GENDER_LABELS[g]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tabText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 32,
    gap: 10,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  studentInfo: {
    flex: 1,
    gap: 2,
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
  },
  studentId: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.primary,
  },
  studentGender: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  genderEditRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderEditChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  genderEditChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  genderEditChipText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  genderEditChipTextActive: {
    color: COLORS.primary,
    fontFamily: "PublicSans_600SemiBold",
  },
  quickActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipApprove: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  chipApproveText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: "#15803D",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: 480,
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  docBox: {
    width: 140,
  },
  docLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  docImg: {
    width: 140,
    height: 100,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
  },
  detailRow: {
    marginBottom: 14,
  },
  detailLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  fieldEdit: {
    marginBottom: 12,
  },
  fieldEditLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldEditInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBg,
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalBtn: {
    flexGrow: 1,
    minWidth: "28%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalBtnPrimaryText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
  modalBtnDanger: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  modalBtnDangerText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#B91C1C",
  },
  modalBtnGhost: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnGhostText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
