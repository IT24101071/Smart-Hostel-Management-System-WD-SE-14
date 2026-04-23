import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
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
import { SafeAreaView } from "react-native-safe-area-context";
import AdminSubHeader from "../../components/admin/AdminSubHeader";
import { COLORS } from "../../constants/colors";
import {
  createAdmin,
  deleteAdmin,
  getFilteredAdminAuditLogs,
  getAdminErrorMessage,
  getAdmins,
  setAdminStatus,
  searchAdmins,
  updateAdmin,
} from "../../services/admin.service";

const TABS = [
  { key: "list", label: "Admins" },
  { key: "activity", label: "Activity" },
  { key: "add", label: "Add admin" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminManagementScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("list");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityAction, setActivityAction] = useState("all");
  const [activityActor, setActivityActor] = useState("");
  const [activityDownloading, setActivityDownloading] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    adminSecret: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = useCallback(async (query = "") => {
    setError("");
    const data = query ? await searchAdmins(query) : await getAdmins();
    setAdmins(data);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setActivityLoading(true);
    try {
      const logs = await getFilteredAdminAuditLogs({
        action: activityAction,
        actor: activityActor.trim(),
      });
      setAuditLogs(logs);
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setActivityLoading(false);
    }
  }, [activityAction, activityActor]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchAdmins("");
      } catch (e) {
        setError(getAdminErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchAdmins]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (tab !== "list") return;
    (async () => {
      try {
        await fetchAdmins(debouncedSearch);
      } catch (e) {
        setError(getAdminErrorMessage(e));
      }
    })();
  }, [debouncedSearch, tab, fetchAdmins]);

  useEffect(() => {
    if (tab === "activity") {
      fetchAuditLogs();
    }
  }, [tab, fetchAuditLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAdmins(debouncedSearch);
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  const onActivityRefresh = async () => {
    setRefreshing(true);
    await fetchAuditLogs();
    setRefreshing(false);
  };

  const filteredAdmins = useMemo(() => admins, [admins]);

  const openModal = (admin) => {
    setSelectedAdmin(admin);
    setEditing(false);
    setEditForm({
      name: admin.name ?? "",
      email: admin.email ?? "",
      password: "",
    });
  };

  const closeModal = () => {
    setSelectedAdmin(null);
    setEditing(false);
    setEditForm({ name: "", email: "", password: "" });
  };

  const handleSaveEdit = async () => {
    if (!selectedAdmin?.id) return;
    if (!editForm.name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    if (!editForm.email.trim()) {
      Alert.alert("Validation", "Email is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdmin(selectedAdmin.id, editForm);
      setAdmins((prev) =>
        prev.map((admin) => (admin.id === selectedAdmin.id ? updated : admin)),
      );
      setSelectedAdmin(updated);
      setEditing(false);
      await fetchAuditLogs();
      Alert.alert("Success", "Admin updated successfully");
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (admin) => {
    const adminId = admin?.id;
    if (!adminId) return;
    Alert.alert(
      "Delete admin",
      `Delete ${admin.name || "this admin"}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAdmin(adminId);
              setAdmins((prev) => prev.filter((item) => item.id !== adminId));
              await fetchAuditLogs();
              closeModal();
              Alert.alert("Success", "Admin deleted successfully");
            } catch (e) {
              Alert.alert("Error", getAdminErrorMessage(e));
            }
          },
        },
      ],
    );
  };

  const handleToggleStatus = async (admin) => {
    if (!admin?.id) return;
    const next = !admin.isApproved;
    try {
      const updated = await setAdminStatus(admin.id, next);
      setAdmins((prev) =>
        prev.map((item) => (item.id === admin.id ? { ...item, ...updated } : item)),
      );
      if (selectedAdmin?.id === admin.id) {
        setSelectedAdmin((prev) => ({ ...prev, ...updated }));
      }
      await fetchAuditLogs();
      Alert.alert("Success", next ? "Admin activated" : "Admin deactivated");
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    }
  };

  const handleCreateAdmin = async () => {
    if (!createForm.name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    if (!createForm.email.trim()) {
      Alert.alert("Validation", "Email is required");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters");
      return;
    }
    if (!createForm.adminSecret.trim()) {
      Alert.alert("Validation", "Admin secret key is required");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAdmin(createForm);
      setAdmins((prev) => [created, ...prev]);
      await fetchAuditLogs();
      setCreateForm({ name: "", email: "", password: "", adminSecret: "" });
      setTab("list");
      Alert.alert("Success", "Admin account created successfully");
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <Pressable style={styles.card} onPress={() => openModal(item)}>
      <View style={styles.avatar}>
        <Ionicons name="shield-outline" size={22} color={COLORS.indigo} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={[styles.statusTag, item.isApproved ? styles.activeTag : styles.inactiveTag]}>
          {item.isApproved ? "Active" : "Inactive"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </Pressable>
  );

  const renderAuditLogItem = ({ item }) => {
    const actor = item?.actor?.name || item?.actor?.email || "Unknown";
    const target =
      item?.targetAdmin?.name || item?.targetAdmin?.email || "Deleted admin";
    const actionLabel =
      item.action === "create_admin"
        ? "Created admin"
        : item.action === "update_admin"
          ? "Updated admin"
          : "Deleted admin";
    return (
      <View style={styles.logCard}>
        <View style={styles.logIconWrap}>
          <Ionicons name="time-outline" size={16} color={COLORS.indigo} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logTitle}>{actionLabel}</Text>
          <Text style={styles.logSubtext}>
            {actor} -> {target}
          </Text>
          <Text style={styles.logTime}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  async function handleDownloadCsv() {
    if (!filteredAdmins.length) {
      Alert.alert("No data", "No admins available to export.");
      return;
    }
    setDownloading(true);
    try {
      const headers = [
        "Name",
        "Email",
        "Last Login",
        "Last Action",
        "Last Action Time",
        "Created At",
      ];
      const rows = filteredAdmins.map((admin) => [
        admin.name ?? "",
        admin.email ?? "",
        admin.lastLoginAt ? new Date(admin.lastLoginAt).toISOString() : "",
        admin.lastAction ?? "",
        admin.lastActionAt ? new Date(admin.lastActionAt).toISOString() : "",
        admin.createdAt ? new Date(admin.createdAt).toISOString() : "",
      ]);
      const escapeCsv = (value) => {
        const text = String(value ?? "");
        const escaped = text.replaceAll('"', '""');
        return `"${escaped}"`;
      };
      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
      const fileName = `admins-${Date.now()}.csv`;

      if (Platform.OS === "web") {
        if (typeof document === "undefined") {
          throw new Error("Web download is not available in this environment.");
        }
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        const uri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "text/csv",
            dialogTitle: "Download Admin List",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Saved", `CSV saved to ${uri}`);
        }
      }
      Alert.alert("Success", "Admin list exported as CSV.");
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadActivityCsv() {
    if (!auditLogs.length) {
      Alert.alert("No data", "No activity logs available to export.");
      return;
    }
    setActivityDownloading(true);
    try {
      const headers = ["Action", "Actor", "Target Admin", "Details", "Created At"];
      const rows = auditLogs.map((log) => [
        log.action || "",
        log?.actor?.email || log?.actor?.name || "",
        log?.targetAdmin?.email || log?.targetAdmin?.name || "",
        log.details || "",
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
      ]);
      const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      const fileName = `admin-activity-${Date.now()}.csv`;
      if (Platform.OS === "web") {
        if (typeof document === "undefined") {
          throw new Error("Web download is not available in this environment.");
        }
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        const uri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "text/csv",
            dialogTitle: "Download Admin Activity",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Saved", `CSV saved to ${uri}`);
        }
      }
      Alert.alert("Success", "Activity log exported as CSV.");
    } catch (e) {
      Alert.alert("Error", getAdminErrorMessage(e));
    } finally {
      setActivityDownloading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <AdminSubHeader
        title="Admin management"
        subtitle={
          tab === "list"
            ? `${filteredAdmins.length} admin${filteredAdmins.length === 1 ? "" : "s"}`
            : tab === "activity"
              ? `${auditLogs.length} recent actions`
            : "Create a new admin account"
        }
        onBack={() => router.back()}
      />

      <View style={styles.tabRow}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "list" ? (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            <Pressable
              style={[styles.csvButton, downloading && { opacity: 0.7 }]}
              onPress={handleDownloadCsv}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="download-outline" size={16} color={COLORS.white} />
              )}
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={fetchAdmins}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filteredAdmins}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.id ?? `admin-${index}`}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.emptyText}>
                    {search.trim() ? "No matching admins found" : "No admins found"}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : tab === "activity" ? (
        activityLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.activityFilters}>
              <View style={styles.actionRow}>
                {[
                  { key: "all", label: "All" },
                  { key: "create_admin", label: "Create" },
                  { key: "update_admin", label: "Update" },
                  { key: "delete_admin", label: "Delete" },
                ].map((option) => {
                  const active = activityAction === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setActivityAction(option.key)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.searchWrap}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by actor name/email"
                  placeholderTextColor={COLORS.textMuted}
                  value={activityActor}
                  onChangeText={setActivityActor}
                />
                <Pressable
                  style={[styles.csvButton, activityDownloading && { opacity: 0.7 }]}
                  onPress={handleDownloadActivityCsv}
                  disabled={activityDownloading}
                >
                  {activityDownloading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="download-outline" size={16} color={COLORS.white} />
                  )}
                </Pressable>
              </View>
            </View>
            <FlatList
              data={auditLogs}
              keyExtractor={(item, index) => item._id || `log-${index}`}
              renderItem={renderAuditLogItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onActivityRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No activity yet</Text>
                </View>
              }
            />
          </>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New admin account</Text>
            <Field
              label="Name"
              value={createForm.name}
              onChangeText={(value) =>
                setCreateForm((prev) => ({ ...prev, name: value }))
              }
              placeholder="Full name"
            />
            <Field
              label="Email"
              value={createForm.email}
              onChangeText={(value) =>
                setCreateForm((prev) => ({ ...prev, email: value }))
              }
              placeholder="admin@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Password"
              value={createForm.password}
              onChangeText={(value) =>
                setCreateForm((prev) => ({ ...prev, password: value }))
              }
              placeholder="At least 6 characters"
              secureTextEntry
            />
            <Field
              label="Admin Secret Key"
              value={createForm.adminSecret}
              onChangeText={(value) =>
                setCreateForm((prev) => ({ ...prev, adminSecret: value }))
              }
              placeholder="Enter backend ADMIN_SECRET_KEY"
              secureTextEntry
            />
            <Pressable
              style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
              onPress={handleCreateAdmin}
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
                  <Text style={styles.primaryButtonText}>Create admin</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}

      {selectedAdmin ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={styles.modalBackdrop} onPress={closeModal} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Admin profile</Text>
                <Pressable onPress={closeModal} hitSlop={12}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {editing ? (
                  <>
                    <Field
                      label="Name"
                      value={editForm.name}
                      onChangeText={(value) =>
                        setEditForm((prev) => ({ ...prev, name: value }))
                      }
                    />
                    <Field
                      label="Email"
                      value={editForm.email}
                      onChangeText={(value) =>
                        setEditForm((prev) => ({ ...prev, email: value }))
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Field
                      label="New password (optional)"
                      value={editForm.password}
                      onChangeText={(value) =>
                        setEditForm((prev) => ({ ...prev, password: value }))
                      }
                      secureTextEntry
                      placeholder="Leave blank to keep current password"
                    />
                  </>
                ) : (
                  <>
                    <DetailRow label="Name" value={selectedAdmin.name} />
                    <DetailRow label="Email" value={selectedAdmin.email} />
                    <DetailRow label="Role" value="Admin" />
                    <DetailRow
                      label="Last login"
                      value={formatDate(selectedAdmin.lastLoginAt)}
                    />
                    <DetailRow
                      label="Last action"
                      value={selectedAdmin.lastAction || "—"}
                    />
                    <DetailRow
                      label="Last action time"
                      value={formatDate(selectedAdmin.lastActionAt)}
                    />
                    <DetailRow label="Created" value={formatDate(selectedAdmin.createdAt)} />
                    <DetailRow
                      label="Last updated"
                      value={formatDate(selectedAdmin.updatedAt)}
                    />
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                {editing ? (
                  <>
                    <Pressable
                      style={[styles.actionButton, styles.ghostButton]}
                      onPress={() => setEditing(false)}
                    >
                      <Text style={styles.ghostButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.primaryAction]}
                      onPress={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.primaryActionText}>Save</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[styles.actionButton, styles.dangerButton]}
                      onPress={() => handleDelete(selectedAdmin)}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionButton,
                        selectedAdmin?.isApproved ? styles.warningButton : styles.successButton,
                      ]}
                      onPress={() => handleToggleStatus(selectedAdmin)}
                    >
                      <Text
                        style={[
                          styles.warningButtonText,
                          !selectedAdmin?.isApproved && styles.successButtonText,
                        ]}
                      >
                        {selectedAdmin?.isApproved ? "Deactivate" : "Activate"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.ghostButton]}
                      onPress={() => setEditing(true)}
                    >
                      <Text style={styles.ghostButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.primaryAction]}
                      onPress={closeModal}
                    >
                      <Text style={styles.primaryActionText}>Done</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.indigoBg,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  tabText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12.5,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.indigo,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  csvButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  errorText: {
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.white,
    fontSize: 14,
  },
  emptyText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  statusTag: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
  },
  activeTag: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  inactiveTag: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  activityFilters: {
    gap: 8,
    paddingTop: 10,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.indigoBg,
    borderColor: "#C7D2FE",
  },
  filterChipText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.indigo,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 28,
    gap: 10,
  },
  card: {
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
    backgroundColor: COLORS.indigoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  email: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  logCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.indigoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  logContent: {
    flex: 1,
    gap: 2,
  },
  logTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  logSubtext: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  logTime: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  formScroll: {
    padding: 12,
    paddingBottom: 30,
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
    marginBottom: 14,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.indigo,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
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
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: 420,
  },
  detailRow: {
    marginBottom: 12,
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
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: "28%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  dangerButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#B91C1C",
  },
  warningButton: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  successButton: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  warningButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#92400E",
  },
  successButtonText: {
    color: "#166534",
  },
  ghostButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghostButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
  },
  primaryActionText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.white,
  },
});
