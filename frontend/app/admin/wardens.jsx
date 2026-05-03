import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../components/admin/AdminSubHeader";
import { COLORS } from "../../constants/colors";
import apiClient from "../../lib/axios";
import { validateNicInput } from "../../lib/nicValidation";
import {
  createWarden,
  getAdminErrorMessage,
  updateWarden,
} from "../../services/admin.service";

const TABS = [
  { key: "list", label: "Wardens" },
  { key: "add", label: "Add warden" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
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

export default function WardenManagement() {
  const router = useRouter();
  const [tab, setTab] = useState("list");
  const [wardens, setWardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalUser, setModalUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editNicPhotoPick, setEditNicPhotoPick] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    nicNumber: "",
  });
  const [addNicPhotoPick, setAddNicPhotoPick] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchWardens = useCallback(async () => {
    const { data } = await apiClient.get("/auth/wardens");
    setWardens(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchWardens();
      } catch {
        Alert.alert("Error", "Failed to load wardens");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWardens]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWardens();
    } catch {
      Alert.alert("Error", "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const openModal = (user, opts = {}) => {
    const wantEdit = opts.edit === true;
    setModalUser(user);
    setEditing(wantEdit);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      nicNumber: user.nicNumber ?? "",
    });
    setEditNicPhotoPick(null);
  };

  const closeModal = () => {
    setModalUser(null);
    setEditing(false);
    setEditForm({});
    setEditNicPhotoPick(null);
  };

  const pickAddNicPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Allow photo library access to attach a NIC photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setAddNicPhotoPick({
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || "nic.jpg",
      });
    }
  };

  const pickEditNicPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Allow photo library access to attach a NIC photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setEditNicPhotoPick({
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || "nic.jpg",
      });
    }
  };

  const handleDelete = (user, label) => {
    const id = getUserRecordId(user);
    if (!id) {
      Alert.alert(
        "Error",
        "Missing warden id. Close this window and open the profile again.",
      );
      return;
    }

    const message = `Remove ${label || "this warden"} permanently?`;

    const executeDelete = async () => {
      try {
        await apiClient.delete(`/auth/users/${encodeURIComponent(id)}`);
        Alert.alert("Success", "Warden deleted");
        closeModal();
        await fetchWardens();
      } catch (e) {
        Alert.alert(
          "Error",
          e?.response?.data?.message || "Failed to delete warden",
        );
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) executeDelete();
      return;
    }

    Alert.alert("Delete warden", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: executeDelete },
    ]);
  };

  const handleSaveEdit = async () => {
    const recordId = getUserRecordId(modalUser);
    if (!recordId) return;
    if (!editForm.name?.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    if (!editForm.email?.trim()) {
      Alert.alert("Validation", "Email is required");
      return;
    }

    const nicCheck = validateNicInput(editForm.nicNumber);
    if (!nicCheck.ok) {
      Alert.alert("Validation", nicCheck.message);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateWarden(recordId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        password: editForm.password?.trim() || undefined,
        nicNumber: editForm.nicNumber?.trim(),
        nicPhoto: editNicPhotoPick || undefined,
      });
      Alert.alert("Success", "Warden updated");
      setModalUser({
        ...updated,
        _id: getUserRecordId(updated) ?? recordId,
      });
      setEditNicPhotoPick(null);
      setEditing(false);
      await fetchWardens();
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWarden = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert("Error", "Email is required");
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    const nicCheck = validateNicInput(formData.nicNumber);
    if (!nicCheck.ok) {
      Alert.alert("Validation", nicCheck.message);
      return;
    }

    setSubmitting(true);
    try {
      await createWarden({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nicNumber: formData.nicNumber.trim(),
        nicPhoto: addNicPhotoPick || undefined,
      });
      Alert.alert("Success", "Warden account created");
      setFormData({ name: "", email: "", password: "", nicNumber: "" });
      setAddNicPhotoPick(null);
      setTab("list");
      await fetchWardens();
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderCard = ({ item }) => (
    <Pressable
      style={styles.wardenCard}
      onPress={() => openModal(item, { edit: false })}
    >
      <View style={styles.avatar}>
        <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.wardenInfo}>
        <Text style={styles.wardenName}>{item.name}</Text>
        <Text style={styles.wardenEmail}>{item.email}</Text>
        <Text style={styles.wardenNic}>NIC: {item.nicNumber ?? "—"}</Text>
        <Text style={styles.wardenMeta}>Warden</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </Pressable>
  );

  const renderDetailModal = () => {
    if (!modalUser) return null;
    const showEdit = editing;

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
              <Text style={styles.modalTitle}>Warden profile</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={26} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                    label="New password (optional)"
                    value={editForm.password}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, password: t }))
                    }
                    secureTextEntry
                    placeholder="Leave blank to keep current"
                  />
                  <FieldEdit
                    label="NIC number"
                    value={editForm.nicNumber}
                    onChangeText={(t) =>
                      setEditForm((f) => ({ ...f, nicNumber: t }))
                    }
                    autoCapitalize="characters"
                    placeholder="12 digits or 9 digits + V/X"
                  />
                  <Pressable style={styles.nicPhotoBtn} onPress={pickEditNicPhoto}>
                    <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.nicPhotoBtnText}>
                      {editNicPhotoPick
                        ? "Replace NIC photo"
                        : "Optional: new NIC photo"}
                    </Text>
                  </Pressable>
                  {editNicPhotoPick ? (
                    <Image
                      source={{ uri: editNicPhotoPick.uri }}
                      style={styles.nicThumb}
                      resizeMode="cover"
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <DetailRow label="Name" value={modalUser.name} />
                  <DetailRow label="Email" value={modalUser.email} />
                  <DetailRow label="NIC" value={modalUser.nicNumber} />
                  {modalUser.nicPhoto ? (
                    <Pressable
                      onPress={() => Linking.openURL(modalUser.nicPhoto)}
                      style={styles.nicLinkRow}
                    >
                      <Text style={styles.nicLinkText}>Open NIC photo</Text>
                      <Ionicons name="open-outline" size={18} color={COLORS.primary} />
                    </Pressable>
                  ) : null}
                  <DetailRow label="Role" value="Warden" />
                  <DetailRow
                    label="Status"
                    value={modalUser.isApproved ? "Active" : "Pending"}
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(modalUser.createdAt)}
                  />
                  <DetailRow
                    label="Last updated"
                    value={formatDate(modalUser.updatedAt)}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {showEdit ? (
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
        title="Warden management"
        subtitle={
          tab === "list"
            ? `${wardens.length} warden${wardens.length === 1 ? "" : "s"}`
            : "Create a new warden account"
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

      {tab === "list" ? (
        <FlatList
          data={wardens}
          renderItem={renderCard}
          keyExtractor={(item, index) =>
            getUserRecordId(item) ?? `${item.email ?? "w"}-${index}`
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyText}>No wardens yet</Text>
              <Text style={styles.emptySubtext}>
                Use the Add warden tab to create one
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.addScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New warden account</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((f) => ({ ...f, name: text }))
                }
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="warden@university.edu"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((f) => ({ ...f, email: text }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textMuted}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData((f) => ({ ...f, password: text }))
                }
                secureTextEntry
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NIC number</Text>
              <TextInput
                style={styles.input}
                placeholder="12 digits (new) or 9 digits + V/X"
                placeholderTextColor={COLORS.textMuted}
                value={formData.nicNumber}
                onChangeText={(text) =>
                  setFormData((f) => ({ ...f, nicNumber: text }))
                }
                autoCapitalize="characters"
              />
            </View>
            <Pressable style={styles.nicPhotoBtn} onPress={pickAddNicPhoto}>
              <Ionicons name="image-outline" size={20} color={COLORS.primary} />
              <Text style={styles.nicPhotoBtnText}>
                {addNicPhotoPick ? "NIC photo selected" : "Optional: NIC photo"}
              </Text>
            </Pressable>
            {addNicPhotoPick ? (
              <Image
                source={{ uri: addNicPhotoPick.uri }}
                style={styles.nicThumbAdd}
                resizeMode="cover"
              />
            ) : null}
            <Pressable
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleCreateWarden}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.submitButtonText}>Create warden</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}

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
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 32,
    gap: 10,
  },
  wardenCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  wardenInfo: {
    flex: 1,
    gap: 2,
  },
  wardenName: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  wardenEmail: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  wardenNic: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  wardenMeta: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 11,
    color: "#7C3AED",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  addScroll: {
    padding: 12,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
  nicPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  nicPhotoBtnText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 14,
    color: COLORS.primary,
  },
  nicThumb: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
    resizeMode: "cover",
  },
  nicThumbAdd: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: "cover",
  },
  nicLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 12,
  },
  nicLinkText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.primary,
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
    maxHeight: "90%",
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
    maxHeight: 420,
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
