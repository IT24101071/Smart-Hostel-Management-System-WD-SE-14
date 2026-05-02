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
import { validateNicInput } from "../../lib/nicValidation";
import {
  createStaff,
  deleteStaff,
  getStaffList,
  getWardenStaffErrorMessage,
  toggleStaffStatus,
  updateStaff,
} from "../../services/warden.service";

const TABS = [
  { key: "list", label: "Staff" },
  { key: "add", label: "Add staff" },
];

function creatorLabel(item) {
  const role = item?.invitedByRole;
  const inv = item?.invitedBy;
  const invName =
    inv && typeof inv === "object" && inv.name ? String(inv.name).trim() : null;
  const invEmail =
    inv && typeof inv === "object" && inv.email ? String(inv.email).trim() : null;
  const who = invName || invEmail || null;

  if (role === "admin") {
    return who ? `Created by admin: ${who}` : "Created by admin";
  }
  if (role === "warden") {
    return who ? `Created by warden: ${who}` : "Created by warden";
  }
  return "Creator: —";
}

export default function AdminStaffManagement() {
  const router = useRouter();
  const [tab, setTab] = useState("list");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nicNumber: "",
  });
  const [modalNicPhotoPick, setModalNicPhotoPick] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    nicNumber: "",
  });
  const [addNicPhotoPick, setAddNicPhotoPick] = useState(null);

  const summary = useMemo(() => {
    const total = Number(meta.totalStaff ?? items.length ?? 0);
    const active = Number(meta.activeStaff ?? 0);
    const inactive = Number(meta.inactiveStaff ?? Math.max(0, total - active));
    return { total, active, inactive };
  }, [items.length, meta.activeStaff, meta.inactiveStaff, meta.totalStaff]);

  const loadStaff = useCallback(
    async (opts = {}) => {
      try {
        if (opts.withSpinner) setLoading(true);
        const res = await getStaffList({
          q: query,
          page: 1,
          limit: 50,
        });
        setItems(Array.isArray(res.users) ? res.users : []);
        setMeta(res.meta || {});
      } catch (error) {
        Alert.alert("Staff", getWardenStaffErrorMessage(error));
      } finally {
        if (opts.withSpinner) setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    loadStaff({ withSpinner: true });
  }, [loadStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadStaff();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    setQuery(searchText.trim());
  };

  const handleSearchTextChange = (value) => {
    setSearchText(value);
    setQuery(value.trim());
  };

  const openEditModal = (user) => {
    setEditMode(true);
    setActiveUser(user);
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      nicNumber: user?.nicNumber ?? "",
    });
    setModalNicPhotoPick(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setActiveUser(null);
    setEditMode(false);
    setForm({ name: "", email: "", password: "", nicNumber: "" });
    setModalNicPhotoPick(null);
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

  const pickModalNicPhoto = async () => {
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
      setModalNicPhotoPick({
        uri: a.uri,
        type: a.mimeType || "image/jpeg",
        name: a.fileName || "nic.jpg",
      });
    }
  };

  const onSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!name) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    if (!email) {
      Alert.alert("Validation", "Email is required");
      return;
    }
    if (!editMode && (!password || password.length < 6)) {
      Alert.alert("Validation", "Password must be at least 6 characters");
      return;
    }
    if (editMode && password && password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters");
      return;
    }

    const nicCheck = validateNicInput(form.nicNumber);
    if (!nicCheck.ok) {
      Alert.alert("Validation", nicCheck.message);
      return;
    }

    try {
      setSubmitting(true);
      if (editMode && activeUser?.id) {
        await updateStaff(activeUser.id, {
          name,
          email,
          password: password || undefined,
          nicNumber: form.nicNumber?.trim(),
          nicPhoto: modalNicPhotoPick || undefined,
        });
      } else {
        await createStaff({
          name,
          email,
          password,
          nicNumber: form.nicNumber?.trim(),
          nicPhoto: modalNicPhotoPick || undefined,
        });
      }
      closeModal();
      await loadStaff();
    } catch (error) {
      Alert.alert("Staff", getWardenStaffErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStaff = async () => {
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
      await createStaff({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nicNumber: formData.nicNumber.trim(),
        nicPhoto: addNicPhotoPick || undefined,
      });
      Alert.alert("Success", "Staff account created");
      setFormData({ name: "", email: "", password: "", nicNumber: "" });
      setAddNicPhotoPick(null);
      setTab("list");
      await loadStaff();
    } catch (error) {
      Alert.alert("Error", getWardenStaffErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleStatus = async (user) => {
    try {
      await toggleStaffStatus(user.id, !Boolean(user.isApproved));
      await loadStaff();
    } catch (error) {
      Alert.alert("Staff", getWardenStaffErrorMessage(error));
    }
  };

  const onDelete = (user) => {
    const label = user?.name || "this staff member";
    const message = `Delete ${label}? This action cannot be undone.`;
    const execute = async () => {
      try {
        await deleteStaff(user.id);
        await loadStaff();
      } catch (error) {
        Alert.alert("Staff", getWardenStaffErrorMessage(error));
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) execute();
      return;
    }
    Alert.alert("Delete staff", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: execute },
    ]);
  };

  const renderCard = ({ item }) => {
    const active = Boolean(item.isApproved);
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.email}</Text>
            <Text style={styles.cardNic}>NIC: {item.nicNumber ?? "—"}</Text>
            <Text style={styles.cardCreator}>{creatorLabel(item)}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              active ? styles.statusPillActive : styles.statusPillInactive,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                active ? styles.statusTextActive : styles.statusTextInactive,
              ]}
            >
              {active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onToggleStatus(item)}>
            <Ionicons
              name={active ? "pause-circle-outline" : "checkmark-circle-outline"}
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.actionText}>{active ? "Deactivate" : "Activate"}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.maintenance} />
            <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <AdminSubHeader
        title="Staff management"
        subtitle="Add, edit & remove staff created by wardens or admins"
        onBack={() => router.back()}
      />

      <View style={styles.root}>
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
          <View style={styles.content}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Staff</Text>
                <Text style={styles.summaryValue}>{summary.total}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Active</Text>
                <Text style={styles.summaryValue}>{summary.active}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Inactive</Text>
                <Text style={styles.summaryValue}>{summary.inactive}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={handleSearchTextChange}
                placeholder="Search staff by name or email"
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable style={styles.searchBtn} onPress={handleSearch}>
                <Ionicons name="search" size={16} color={COLORS.white} />
              </Pressable>
            </View>

            <Pressable style={styles.reloadBtn} onPress={() => loadStaff({ withSpinner: true })}>
              <Text style={styles.reloadBtnText}>Refresh list</Text>
            </Pressable>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCard}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={items.length ? styles.listContent : styles.emptyWrap}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No staff found for the selected filter.</Text>
                }
              />
            )}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.addScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New staff account</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.name}
                  onChangeText={(text) => setFormData((f) => ({ ...f, name: text }))}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="staff@hostel.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.email}
                  onChangeText={(text) => setFormData((f) => ({ ...f, email: text }))}
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
                  onChangeText={(text) => setFormData((f) => ({ ...f, password: text }))}
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
                  onChangeText={(text) => setFormData((f) => ({ ...f, nicNumber: text }))}
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
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreateStaff}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Create staff</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}

        <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={closeModal} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editMode ? "Edit staff" : "Add staff"}</Text>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  value={form.name}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder={editMode ? "New password (optional)" : "Password"}
                  secureTextEntry
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="NIC (12 digits or 9 + V/X)"
                  autoCapitalize="characters"
                  value={form.nicNumber}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, nicNumber: value }))}
                />
                {editMode && activeUser?.nicPhoto ? (
                  <Pressable
                    style={styles.nicLinkRow}
                    onPress={() => Linking.openURL(activeUser.nicPhoto)}
                  >
                    <Text style={styles.nicLinkText}>Open current NIC photo</Text>
                    <Ionicons name="open-outline" size={18} color={COLORS.primary} />
                  </Pressable>
                ) : null}
                <Pressable style={styles.nicPhotoBtn} onPress={pickModalNicPhoto}>
                  <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.nicPhotoBtnText}>
                    {modalNicPhotoPick ? "Replace NIC photo" : "Optional: NIC photo"}
                  </Text>
                </Pressable>
                {modalNicPhotoPick ? (
                  <Image
                    source={{ uri: modalNicPhotoPick.uri }}
                    style={styles.nicThumb}
                    resizeMode="cover"
                  />
                ) : null}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnSecondary} onPress={closeModal}>
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalBtnPrimary} onPress={onSubmit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>
                      {editMode ? "Save" : "Create"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 12,
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
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  summaryLabel: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  reloadBtn: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reloadBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  emptyWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardNic: {
    marginTop: 4,
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardCreator: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillActive: {
    borderColor: "#A7E0B8",
    backgroundColor: "#EEF9F1",
  },
  statusPillInactive: {
    borderColor: "#F8D6A0",
    backgroundColor: "#FFF8EC",
  },
  statusPillText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
  },
  statusTextActive: {
    color: "#207A3A",
  },
  statusTextInactive: {
    color: "#9A6400",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  actionText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  actionTextDanger: {
    color: COLORS.maintenance,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 0,
  },
  modalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalScroll: {
    maxHeight: 280,
  },
  nicPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginBottom: 4,
  },
  nicPhotoBtnText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 14,
    color: COLORS.primary,
  },
  nicThumb: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  nicThumbAdd: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  nicLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 4,
  },
  nicLinkText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
    marginBottom: 12,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
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
  modalActions: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.white,
  },
  modalBtnSecondaryText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.textPrimary,
  },
  modalBtnPrimary: {
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: COLORS.primary,
    minWidth: 74,
    alignItems: "center",
  },
  modalBtnPrimaryText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.white,
  },
});
