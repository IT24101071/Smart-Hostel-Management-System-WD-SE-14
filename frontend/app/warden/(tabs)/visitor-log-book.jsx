import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  getActiveVisitorRooms,
  checkInVisitor,
  checkOutVisitor,
  updateVisitor,
  getVisitorErrorMessage,
  getVisitors,
  getRoomStudents,
} from "../../../services/visitor.service";
import { useRouter } from "expo-router";

const STATUS_OPTIONS = ["all", "checked_in", "overdue", "checked_out"];
const VISITOR_TABS = ["add_visitor", "visitor_records"];

export default function WardenVisitorLogBookScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("add_visitor");
  const [roomNo, setRoomNo] = useState("");
  const [roomOptions, setRoomOptions] = useState([]);
  const [roomStudents, setRoomStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomLookupLoading, setRoomLookupLoading] = useState(false);
  const [roomLookupError, setRoomLookupError] = useState("");
  const [showRoomOptions, setShowRoomOptions] = useState(false);
  const [showStudentOptions, setShowStudentOptions] = useState(false);
  const [showExpectedOutPicker, setShowExpectedOutPicker] = useState(false);
  const [expectedOutPickerMode, setExpectedOutPickerMode] = useState("date");
  const [expectedOutDraft, setExpectedOutDraft] = useState(null);
  const [editingVisitorId, setEditingVisitorId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    nationalIdOrPassport: "",
    contactNumber: "",
    relationshipToStudent: "",
    purposeOfVisit: "",
    expectedTimeOut: "",
  });
  const [showEditExpectedOutPicker, setShowEditExpectedOutPicker] = useState(false);
  const [editExpectedOutPickerMode, setEditExpectedOutPickerMode] = useState("date");
  const [editExpectedOutDraft, setEditExpectedOutDraft] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    nationalIdOrPassport: "",
    contactNumber: "",
    studentName: "",
    studentIdOrRoom: "",
    relationshipToStudent: "",
    purposeOfVisit: "",
    expectedTimeOut: "",
    idImage: null,
  });

  async function handleLogout() {
    await storage.clear();
    router.replace("/");
  }

  const isFormValid = useMemo(() => {
    return (
      form.fullName.trim() &&
      form.nationalIdOrPassport.trim() &&
      form.contactNumber.trim() &&
      roomNo.trim() &&
      selectedStudentId &&
      form.relationshipToStudent.trim() &&
      form.purposeOfVisit.trim() &&
      form.expectedTimeOut.trim()
    );
  }, [form, roomNo, selectedStudentId]);

  const loadVisitors = useCallback(
    async ({ withLoader = true } = {}) => {
      try {
        if (withLoader) setLoading(true);
        const result = await getVisitors({
          status: statusFilter === "all" ? "" : statusFilter,
          search,
          page: 1,
          limit: 100,
        });
        setRecords(result.data);
      } catch (error) {
        Alert.alert("Could not load visitors", getVisitorErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const loadActiveRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const list = await getActiveVisitorRooms();
      setRoomOptions(list);
    } catch (error) {
      Alert.alert("Could not load rooms", getVisitorErrorMessage(error));
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveRooms();
  }, [loadActiveRooms]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectedStudent = useMemo(
    () => roomStudents.find((item) => item.id === selectedStudentId) ?? null,
    [roomStudents, selectedStudentId],
  );
  const isStudentLocked = roomStudents.length === 1 && Boolean(selectedStudent);
  const expectedOutLabel = useMemo(() => {
    if (!form.expectedTimeOut) return "Expected Time Out";
    const date = new Date(form.expectedTimeOut);
    if (Number.isNaN(date.getTime())) return "Expected Time Out";
    return date.toLocaleString();
  }, [form.expectedTimeOut]);
  const editExpectedOutLabel = useMemo(() => {
    if (!editForm.expectedTimeOut) return "Expected Time Out";
    const date = new Date(editForm.expectedTimeOut);
    if (Number.isNaN(date.getTime())) return "Expected Time Out";
    return date.toLocaleString();
  }, [editForm.expectedTimeOut]);

  const lookupStudentsForRoom = useCallback(
    async (inputRoom = roomNo) => {
      const normalizedRoom = String(inputRoom ?? "").trim();
      if (!normalizedRoom) {
        setRoomStudents([]);
        setSelectedStudentId("");
        setRoomLookupError("");
        return;
      }
      setRoomLookupLoading(true);
      setRoomLookupError("");
      setShowRoomOptions(false);
      setShowStudentOptions(false);
      try {
        const list = await getRoomStudents(normalizedRoom);
        setRoomStudents(list);
        if (!list.length) {
          setSelectedStudentId("");
          setRoomLookupError("No active confirmed students found for this room.");
          return;
        }
        if (list.length === 1) {
          setSelectedStudentId(list[0].id);
          return;
        }
        setSelectedStudentId("");
      } catch (error) {
        setRoomStudents([]);
        setSelectedStudentId("");
        setRoomLookupError(getVisitorErrorMessage(error));
      } finally {
        setRoomLookupLoading(false);
      }
    },
    [roomNo],
  );

  const pickIdImage = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Unsupported", "ID image upload is available on Android/iOS in this phase.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to upload ID image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    setField("idImage", {
      uri: file.uri,
      name: file.fileName || "visitor-id.jpg",
      mimeType: file.mimeType || "image/jpeg",
      size: file.fileSize ?? file.size,
    });
  }, [setField]);

  const openExpectedOutPicker = useCallback(() => {
    const baseDate =
      form.expectedTimeOut && !Number.isNaN(new Date(form.expectedTimeOut).getTime())
        ? new Date(form.expectedTimeOut)
        : new Date();
    setExpectedOutDraft(baseDate);
    setExpectedOutPickerMode("date");
    setShowExpectedOutPicker(true);
  }, [form.expectedTimeOut]);

  const onExpectedOutChange = useCallback(
    (event, selectedValue) => {
      if (event?.type === "dismissed") {
        setShowExpectedOutPicker(false);
        return;
      }
      if (!selectedValue) {
        setShowExpectedOutPicker(false);
        return;
      }

      const current =
        expectedOutDraft && !Number.isNaN(new Date(expectedOutDraft).getTime())
          ? new Date(expectedOutDraft)
          : form.expectedTimeOut && !Number.isNaN(new Date(form.expectedTimeOut).getTime())
            ? new Date(form.expectedTimeOut)
            : new Date();
      const nextDate = new Date(current);

      if (expectedOutPickerMode === "date") {
        nextDate.setFullYear(
          selectedValue.getFullYear(),
          selectedValue.getMonth(),
          selectedValue.getDate(),
        );
        setExpectedOutDraft(nextDate);
        if (Platform.OS === "android") {
          setExpectedOutPickerMode("time");
          setShowExpectedOutPicker(true);
        } else {
          setExpectedOutPickerMode("time");
        }
        return;
      }

      nextDate.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
      setField("expectedTimeOut", nextDate.toISOString());
      setShowExpectedOutPicker(false);
      setExpectedOutPickerMode("date");
      setExpectedOutDraft(null);
    },
    [expectedOutDraft, expectedOutPickerMode, form.expectedTimeOut, setField],
  );

  const submitCheckIn = useCallback(async () => {
    if (!isFormValid) {
      Alert.alert("Missing details", "Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const expectedDate = new Date(form.expectedTimeOut);
      if (Number.isNaN(expectedDate.getTime())) {
        Alert.alert("Invalid date", "Use a valid date-time format (example: 2026-04-27T18:30).");
        return;
      }
      const isoTime = expectedDate.toISOString();
      const createdVisitor = await checkInVisitor({
        ...form,
        studentName: selectedStudent?.name ?? "",
        studentIdOrRoom: roomNo.trim(),
        expectedTimeOut: isoTime,
      });
      setRoomNo("");
      setShowRoomOptions(false);
      setRoomStudents([]);
      setSelectedStudentId("");
      setRoomLookupError("");
      setShowStudentOptions(false);
      setForm({
        fullName: "",
        nationalIdOrPassport: "",
        contactNumber: "",
        studentName: "",
        studentIdOrRoom: "",
        relationshipToStudent: "",
        purposeOfVisit: "",
        expectedTimeOut: "",
        idImage: null,
      });
      setStatusFilter("all");
      setSearch("");
      setRecords((prev) => [createdVisitor, ...prev.filter((item) => item.id !== createdVisitor?.id)]);
      setActiveTab("visitor_records");
      Alert.alert("Success", "Visitor checked in and saved.");
      await loadVisitors({ withLoader: false });
    } catch (error) {
      Alert.alert("Check-in failed", getVisitorErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [form, isFormValid, loadVisitors, roomNo, selectedStudent]);

  const onCheckOut = useCallback(
    (item) => {
      Alert.alert("Check out visitor", `Mark ${item.fullName} as checked out?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check out",
          onPress: async () => {
            try {
              await checkOutVisitor(item.id);
              await loadVisitors({ withLoader: false });
            } catch (error) {
              Alert.alert("Check-out failed", getVisitorErrorMessage(error));
            }
          },
        },
      ]);
    },
    [loadVisitors],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisitors({ withLoader: false });
    setRefreshing(false);
  }, [loadVisitors]);

  const startEditVisitor = useCallback((item) => {
    setEditingVisitorId(item.id);
    setEditForm({
      fullName: item.fullName || "",
      nationalIdOrPassport: item.nationalIdOrPassport || "",
      contactNumber: item.contactNumber || "",
      relationshipToStudent: item.relationshipToStudent || "",
      purposeOfVisit: item.purposeOfVisit || "",
      expectedTimeOut: item.expectedTimeOut
        ? new Date(item.expectedTimeOut).toISOString()
        : "",
    });
  }, []);

  const cancelEditVisitor = useCallback(() => {
    setEditingVisitorId("");
    setSavingEdit(false);
    setShowEditExpectedOutPicker(false);
    setEditExpectedOutPickerMode("date");
    setEditExpectedOutDraft(null);
  }, []);

  const openEditExpectedOutPicker = useCallback(() => {
    const baseDate =
      editForm.expectedTimeOut && !Number.isNaN(new Date(editForm.expectedTimeOut).getTime())
        ? new Date(editForm.expectedTimeOut)
        : new Date();
    setEditExpectedOutDraft(baseDate);
    setEditExpectedOutPickerMode("date");
    setShowEditExpectedOutPicker(true);
  }, [editForm.expectedTimeOut]);

  const onEditExpectedOutChange = useCallback(
    (event, selectedValue) => {
      if (event?.type === "dismissed") {
        setShowEditExpectedOutPicker(false);
        return;
      }
      if (!selectedValue) {
        setShowEditExpectedOutPicker(false);
        return;
      }

      const current =
        editExpectedOutDraft && !Number.isNaN(new Date(editExpectedOutDraft).getTime())
          ? new Date(editExpectedOutDraft)
          : editForm.expectedTimeOut && !Number.isNaN(new Date(editForm.expectedTimeOut).getTime())
            ? new Date(editForm.expectedTimeOut)
            : new Date();
      const nextDate = new Date(current);

      if (editExpectedOutPickerMode === "date") {
        nextDate.setFullYear(
          selectedValue.getFullYear(),
          selectedValue.getMonth(),
          selectedValue.getDate(),
        );
        setEditExpectedOutDraft(nextDate);
        if (Platform.OS === "android") {
          setEditExpectedOutPickerMode("time");
          setShowEditExpectedOutPicker(true);
        } else {
          setEditExpectedOutPickerMode("time");
        }
        return;
      }

      nextDate.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
      setEditForm((prev) => ({ ...prev, expectedTimeOut: nextDate.toISOString() }));
      setShowEditExpectedOutPicker(false);
      setEditExpectedOutPickerMode("date");
      setEditExpectedOutDraft(null);
    },
    [editExpectedOutDraft, editExpectedOutPickerMode, editForm.expectedTimeOut],
  );

  const saveVisitorEdit = useCallback(async () => {
    if (!editingVisitorId) return;
    if (
      !editForm.fullName.trim() ||
      !editForm.nationalIdOrPassport.trim() ||
      !editForm.contactNumber.trim() ||
      !editForm.relationshipToStudent.trim() ||
      !editForm.purposeOfVisit.trim() ||
      !editForm.expectedTimeOut.trim()
    ) {
      Alert.alert("Missing details", "Please fill all required fields.");
      return;
    }

    const expectedDate = new Date(editForm.expectedTimeOut);
    if (Number.isNaN(expectedDate.getTime())) {
      Alert.alert("Invalid date", "Please choose a valid expected time out.");
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateVisitor(editingVisitorId, {
        ...editForm,
        expectedTimeOut: expectedDate.toISOString(),
      });
      setRecords((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      cancelEditVisitor();
      Alert.alert("Success", "Visitor details updated.");
      await loadVisitors({ withLoader: false });
    } catch (error) {
      Alert.alert("Update failed", getVisitorErrorMessage(error));
      setSavingEdit(false);
    }
  }, [cancelEditVisitor, editForm, editingVisitorId, loadVisitors]);

  const renderStatusBadge = (status) => {
    const style =
      status === "checked_out"
        ? styles.badgeCheckedOut
        : status === "overdue"
          ? styles.badgeOverdue
          : styles.badgeCheckedIn;
    return (
      <View style={[styles.badge, style]}>
        <Text style={styles.badgeText}>{status.replace("_", " ").toUpperCase()}</Text>
      </View>
    );
  };

  const renderRow = ({ item }) => {
    const isEditing = editingVisitorId === item.id;
    return (
      <View style={styles.recordCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.recordName}>{item.fullName}</Text>
          {renderStatusBadge(item.status)}
        </View>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={editForm.fullName}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, fullName: value }))}
              placeholder="Visitor full name"
            />
            <TextInput
              style={styles.input}
              value={editForm.nationalIdOrPassport}
              onChangeText={(value) =>
                setEditForm((prev) => ({ ...prev, nationalIdOrPassport: value }))
              }
              placeholder="National ID / Passport Number"
            />
            <TextInput
              style={styles.input}
              value={editForm.contactNumber}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, contactNumber: value }))}
              placeholder="Contact Number"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={editForm.relationshipToStudent}
              onChangeText={(value) =>
                setEditForm((prev) => ({ ...prev, relationshipToStudent: value }))
              }
              placeholder="Relationship to Student"
            />
            <TextInput
              style={styles.input}
              value={editForm.purposeOfVisit}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, purposeOfVisit: value }))}
              placeholder="Purpose of Visit"
            />
            <Pressable style={styles.dateInput} onPress={openEditExpectedOutPicker}>
              <Text
                style={[
                  styles.inputLikeText,
                  !editForm.expectedTimeOut ? styles.inputLikePlaceholder : null,
                ]}
              >
                {editForm.expectedTimeOut ? editExpectedOutLabel : "Expected Time Out"}
              </Text>
            </Pressable>
            {showEditExpectedOutPicker ? (
              <DateTimePicker
                value={
                  editForm.expectedTimeOut &&
                  !Number.isNaN(new Date(editForm.expectedTimeOut).getTime())
                    ? new Date(editForm.expectedTimeOut)
                    : new Date()
                }
                mode={editExpectedOutPickerMode}
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={onEditExpectedOutChange}
              />
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.recordMeta}>
              ID: {item.nationalIdOrPassport} | Contact: {item.contactNumber}
            </Text>
            <Text style={styles.recordMeta}>
              Student: {item.studentNameSnapshot} ({item.studentIdSnapshot || "N/A"}) - Room{" "}
              {item.studentRoomSnapshot || "N/A"}
            </Text>
            <Text style={styles.recordMeta}>
              Purpose: {item.purposeOfVisit} | Relationship: {item.relationshipToStudent}
            </Text>
            <Text style={styles.recordMeta}>
              Expected Out: {new Date(item.expectedTimeOut).toLocaleString()}
            </Text>
          </>
        )}
        {item.checkOutAt ? (
          <Text style={styles.recordMeta}>Checked Out: {new Date(item.checkOutAt).toLocaleString()}</Text>
        ) : null}
        {item.status !== "checked_out" ? (
          isEditing ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.editActionBtn, styles.cancelEditBtn]}
                onPress={cancelEditVisitor}
                disabled={savingEdit}
              >
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editActionBtn, styles.saveEditBtn, savingEdit ? styles.btnDisabled : null]}
                onPress={saveVisitorEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveEditText}>Save</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable style={styles.editBtn} onPress={() => startEditVisitor(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.checkoutBtn} onPress={() => onCheckOut(item)}>
                <Text style={styles.checkoutText}>Check Out</Text>
              </Pressable>
            </View>
          )
        ) : null}
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
      <WardenSubHeader
        title="Visitor Log Book"
        subtitle="Track and manage visitor records"
      />
      <View style={styles.tabRow}>
        {VISITOR_TABS.map((tab) => {
          const isActive = tab === activeTab;
          const label = tab === "add_visitor" ? "Add Visitor" : "Visitor Records";
          return (
            <Pressable
              key={tab}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "add_visitor" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visitor Check-In</Text>
            <Text style={styles.fieldLabel}>Room Number</Text>
            <Pressable
              style={styles.studentSelectTrigger}
              onPress={() => setShowRoomOptions((prev) => !prev)}
            >
              <Text style={styles.studentSelectTriggerText}>
                {roomNo || (roomsLoading ? "Loading rooms..." : "Select Room")}
              </Text>
              <Ionicons
                name={showRoomOptions ? "chevron-up-outline" : "chevron-down-outline"}
                size={16}
                color={COLORS.textPrimary}
              />
            </Pressable>
            {showRoomOptions ? (
              <View style={styles.studentOptions}>
                {roomsLoading ? (
                  <View style={styles.optionLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : roomOptions.length ? (
                  roomOptions.map((room) => (
                    <Pressable
                      key={room.roomNumber}
                      style={styles.studentOption}
                      onPress={() => {
                        setRoomNo(room.roomNumber);
                        setRoomStudents([]);
                        setSelectedStudentId("");
                        setRoomLookupError("");
                        setShowStudentOptions(false);
                        setShowRoomOptions(false);
                        lookupStudentsForRoom(room.roomNumber);
                      }}
                    >
                      <Text style={styles.studentOptionText}>{room.roomNumber}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.optionEmptyRow}>
                    <Text style={styles.optionEmptyText}>No active rooms found</Text>
                  </View>
                )}
              </View>
            ) : null}

            {roomLookupLoading ? (
              <View style={styles.lookupLoadingWrap}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null}

            {roomLookupError ? <Text style={styles.errorText}>{roomLookupError}</Text> : null}

            {roomStudents.length ? (
              <View style={styles.studentBlock}>
                <Text style={styles.fieldLabel}>Student Name</Text>
                {isStudentLocked ? (
                  <View style={styles.lockedField}>
                    <Text style={styles.lockedFieldText}>
                      {selectedStudent?.name} ({selectedStudent?.studentId || "No ID"})
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Pressable
                      style={styles.studentSelectTrigger}
                      onPress={() => setShowStudentOptions((prev) => !prev)}
                    >
                      <Text style={styles.studentSelectTriggerText}>
                        {selectedStudent
                          ? `${selectedStudent.name} (${selectedStudent.studentId || "No ID"})`
                          : "Select Student"}
                      </Text>
                      <Ionicons
                        name={showStudentOptions ? "chevron-up-outline" : "chevron-down-outline"}
                        size={16}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    {showStudentOptions ? (
                      <View style={styles.studentOptions}>
                        {roomStudents.map((student) => (
                          <Pressable
                            key={student.id}
                            style={styles.studentOption}
                            onPress={() => {
                              setSelectedStudentId(student.id);
                              setShowStudentOptions(false);
                            }}
                          >
                            <Text style={styles.studentOptionText}>
                              {student.name} ({student.studentId || "No ID"})
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            {!selectedStudent ? null : (
              <>
                <Text style={styles.subSectionTitle}>Visitor Details</Text>
                <TextInput
                  style={styles.input}
                  value={form.fullName}
                  onChangeText={(value) => setField("fullName", value)}
                  placeholder="Full Name"
                />
                <TextInput
                  style={styles.input}
                  value={form.nationalIdOrPassport}
                  onChangeText={(value) => setField("nationalIdOrPassport", value)}
                  placeholder="National ID / Passport Number"
                />
                <TextInput
                  style={styles.input}
                  value={form.contactNumber}
                  onChangeText={(value) => setField("contactNumber", value)}
                  placeholder="Contact Number"
                  keyboardType="phone-pad"
                />
              </>
            )}
            {!selectedStudent ? null : (
              <>
            <TextInput
              style={styles.input}
              value={form.relationshipToStudent}
              onChangeText={(value) => setField("relationshipToStudent", value)}
              placeholder="Relationship to Student"
            />
            <TextInput
              style={styles.input}
              value={form.purposeOfVisit}
              onChangeText={(value) => setField("purposeOfVisit", value)}
              placeholder="Purpose of Visit"
            />
            <Pressable style={styles.dateInput} onPress={openExpectedOutPicker}>
              <Text
                style={[
                  styles.inputLikeText,
                  !form.expectedTimeOut ? styles.inputLikePlaceholder : null,
                ]}
              >
                {form.expectedTimeOut ? expectedOutLabel : "Expected Time Out"}
              </Text>
            </Pressable>
            {showExpectedOutPicker ? (
              <DateTimePicker
                value={
                  form.expectedTimeOut && !Number.isNaN(new Date(form.expectedTimeOut).getTime())
                    ? new Date(form.expectedTimeOut)
                    : new Date()
                }
                mode={expectedOutPickerMode}
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={onExpectedOutChange}
              />
            ) : null}
            <Pressable style={styles.uploadBtn} onPress={pickIdImage}>
              <Ionicons name="image-outline" size={18} color={COLORS.primary} />
              <Text style={styles.uploadText}>
                {form.idImage?.name ? form.idImage.name : "Upload ID Image (optional)"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, !isFormValid || submitting ? styles.btnDisabled : null]}
              disabled={!isFormValid || submitting}
              onPress={submitCheckIn}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>Submit Check-In</Text>
              )}
            </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Visitor Records</Text>
              <TextInput
                style={styles.input}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => loadVisitors()}
                placeholder="Search by visitor name/ID/contact"
              />
              <View style={styles.filterRow}>
                {STATUS_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.filterChip,
                      statusFilter === option ? styles.filterChipActive : null,
                    ]}
                    onPress={() => setStatusFilter(option)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === option ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {option.replace("_", " ").toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.searchBtn} onPress={() => loadVisitors()}>
                <Text style={styles.searchBtnText}>Apply Filters</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <Text style={styles.note}>No visitor records found.</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tabButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  tabButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  subSectionTitle: {
    marginTop: 4,
    marginBottom: 10,
    fontFamily: "PublicSans_700Bold",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  note: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  dateInput: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },
  inputLikeText: {
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textPrimary,
  },
  inputLikePlaceholder: {
    color: COLORS.textMuted,
  },
  uploadBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  uploadText: {
    flex: 1,
    fontFamily: "PublicSans_500Medium",
    color: COLORS.textPrimary,
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  submitText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.white,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 10,
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: "#C81E1E",
  },
  studentBlock: {
    marginBottom: 10,
  },
  fieldLabel: {
    marginBottom: 6,
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  lockedField: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#EEF4FF",
  },
  lockedFieldText: {
    fontFamily: "PublicSans_500Medium",
    color: COLORS.textPrimary,
  },
  studentSelectTrigger: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  studentSelectTriggerText: {
    flex: 1,
    marginRight: 8,
    fontFamily: "PublicSans_500Medium",
    color: COLORS.textPrimary,
  },
  studentOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  studentOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  studentOptionText: {
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textPrimary,
  },
  optionLoadingRow: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionEmptyRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionEmptyText: {
    fontFamily: "PublicSans_400Regular",
    color: COLORS.textMuted,
  },
  lookupLoadingWrap: {
    marginTop: 8,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  searchBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.white,
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  recordName: {
    flex: 1,
    fontFamily: "PublicSans_700Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  recordMeta: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeCheckedIn: {
    backgroundColor: "#E8F4FD",
  },
  badgeOverdue: {
    backgroundColor: "#FEECEC",
  },
  badgeCheckedOut: {
    backgroundColor: "#EAF9EE",
  },
  badgeText: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  checkoutBtn: {
    marginTop: 8,
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  checkoutText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.primary,
    fontSize: 12,
  },
  actionRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  editBtnText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  editActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cancelEditText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  saveEditBtn: {
    backgroundColor: COLORS.primary,
  },
  saveEditText: {
    fontFamily: "PublicSans_700Bold",
    color: COLORS.white,
    fontSize: 12,
  },
});
