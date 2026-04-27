import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import WardenAppBar from "../../../components/warden/WardenAppBar";
import WardenSubHeader from "../../../components/warden/WardenSubHeader";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";
import {
  createStaff,
  deleteStaff,
  getStaffList,
  getWardenStaffErrorMessage,
  toggleStaffStatus,
  updateStaff,
} from "../../../services/warden.service";

const TABS = [
  { key: "list", label: "Staff" },
  { key: "add", label: "Add staff" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function WardenStaffScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("list");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

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
          active: activeFilter === "all" ? undefined : activeFilter,
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
    [activeFilter, query],
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

  const openCreateModal = () => {
    setTab("add");
  };

  const openEditModal = (user) => {
    setEditMode(true);
    setActiveUser(user);
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setActiveUser(null);
    setEditMode(false);
    setForm({ name: "", email: "", password: "" });
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

    try {
      setSubmitting(true);
      if (editMode && activeUser?.id) {
        await updateStaff(activeUser.id, { name, email, password });
      } else {
        await createStaff({ name, email, password });
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

    setSubmitting(true);
    try {
      await createStaff({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      Alert.alert("Success", "Staff account created");
      setFormData({ name: "", email: "", password: "" });
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
    <View style={styles.root}>
      <WardenAppBar
        title="Warden Dashboard"
        subtitle="Smart Hostel Management"
        onLogout={handleLogout}
      />
      <WardenSubHeader title="Staff Management" subtitle="Manage registered staff" />

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
            value={query}
            onChangeText={setQuery}
            placeholder="Search staff by name or email"
            onSubmitEditing={() => loadStaff()}
            returnKeyType="search"
          />
        </View>

        <Pressable style={styles.reloadBtn} onPress={() => loadStaff({ withSpinner: true })}>
          <Text style={styles.reloadBtnText}>Refresh List</Text>
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
            <Pressable
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleCreateStaff}
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
            <Text style={styles.modalTitle}>{editMode ? "Edit Staff" : "Add New Staff"}</Text>
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
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
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
    alignItems: "center",
  },
  cardTitleWrap: {
    flex: 1,
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
