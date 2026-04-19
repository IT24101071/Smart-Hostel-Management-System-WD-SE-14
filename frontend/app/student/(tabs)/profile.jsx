import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import apiClient from "../../../lib/axios";
import { storage } from "../../../lib/storage";
import {
  changePassword,
  deleteAccount,
  getAuthErrorMessage,
  updateMyProfile,
} from "../../../services/auth.service";
import { ROOM_GENDER_LABELS } from "../../../types/room";

const accountSource = require("../../../assets/icons/account.svg");

const MIN_NEW_PASSWORD_LEN = 8;

/** Dropdown options; current value is merged in if outside this list */
const ACADEMIC_YEAR_OPTIONS = [1, 2, 3, 4];
const SEMESTER_OPTIONS = [1, 2];

function mergeNumericOption(base, currentStr) {
  const n = currentStr.trim() === "" ? NaN : Number(currentStr);
  const set = new Set(base);
  if (Number.isFinite(n)) set.add(n);
  return Array.from(set).sort((a, b) => a - b);
}

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function resolveImageMime(rawType, filename, blobType) {
  const candidates = [rawType, blobType]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());
  for (const c of candidates) {
    if (c === "image/jpg") return "image/jpeg";
    if (c === "image/jpeg" || c === "image/png" || c === "image/webp") return c;
  }
  const base = (filename || "").split(/[/\\]/).pop() ?? "";
  const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  return "image/jpeg";
}

async function appendProfileImageField(formData, image) {
  if (!image) return;

  if (Platform.OS === "web") {
    if (typeof File !== "undefined" && image instanceof File) {
      formData.append("profileImage", image);
      return;
    }
    const uri = image.uri;
    if (typeof uri !== "string") {
      throw new Error("Invalid image: missing uri on web");
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = image.name || "profile.jpg";
    const mime = resolveImageMime(image.type, filename, blob.type);
    formData.append(
      "profileImage",
      new File([blob], filename, { type: mime }),
    );
    return;
  }

  const filename = image.name || "profile.jpg";
  const mime = resolveImageMime(image.type, filename, undefined);

  formData.append("profileImage", {
    uri: image.uri,
    type: mime,
    name: filename,
  });
}

function dash(v) {
  if (v == null || v === "") return "—";
  return String(v);
}

function formatGender(g) {
  if (g === "male") return ROOM_GENDER_LABELS.male;
  if (g === "female") return ROOM_GENDER_LABELS.female;
  return "—";
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function StudentProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const firstFocusLoad = useRef(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContactNo, setEditContactNo] = useState("");
  const [editGuardianName, setEditGuardianName] = useState("");
  const [editGuardianContact, setEditGuardianContact] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [academicPicker, setAcademicPicker] = useState(null);
  const [pickedProfileImage, setPickedProfileImage] = useState(null);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);

  const yearOptions = useMemo(
    () => mergeNumericOption(ACADEMIC_YEAR_OPTIONS, editYear),
    [editYear],
  );
  const semesterOptions = useMemo(
    () => mergeNumericOption(SEMESTER_OPTIONS, editSemester),
    [editSemester],
  );

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    const showFullScreen = firstFocusLoad.current;
    if (showFullScreen) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const { data: me } = await apiClient.get("/auth/me");
      setUser(me);
      await storage.setUser(me);
    } catch (e) {
      setError(getAuthErrorMessage(e));
      const cached = await storage.getUser();
      if (cached) setUser(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstFocusLoad.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/student");
    }
  }

  function beginEdit() {
    setAcademicPicker(null);
    setEditName(user?.name ?? "");
    setEditContactNo(user?.contactNo ?? "");
    setEditGuardianName(user?.guardianName ?? "");
    setEditGuardianContact(user?.guardianContact ?? "");
    setEditYear(
      user?.year != null && user.year !== "" ? String(user.year) : "",
    );
    setEditSemester(
      user?.semester != null && user.semester !== ""
        ? String(user.semester)
        : "",
    );
    setPickedProfileImage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setAcademicPicker(null);
    setPickedProfileImage(null);
  }

  async function pickProfilePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setPickedProfileImage({
        uri: result.assets[0].uri,
        type: result.assets[0].type || "image/jpeg",
        name: result.assets[0].fileName || "profile.jpg",
      });
    }
  }

  async function saveProfile() {
    if (!editName.trim()) {
      Alert.alert("Validation", "Full name cannot be empty.");
      return;
    }
    if (editYear.trim() !== "") {
      const y = Number(editYear.trim());
      if (!Number.isFinite(y)) {
        Alert.alert("Validation", "Year must be a valid number.");
        return;
      }
    }
    if (editSemester.trim() !== "") {
      const s = Number(editSemester.trim());
      if (!Number.isFinite(s)) {
        Alert.alert("Validation", "Semester must be a valid number.");
        return;
      }
    }
    try {
      setSaveProfileLoading(true);
      let updated;
      if (pickedProfileImage) {
        const formData = new FormData();
        formData.append("name", editName.trim());
        formData.append("contactNo", editContactNo.trim());
        formData.append("guardianName", editGuardianName.trim());
        formData.append("guardianContact", editGuardianContact.trim());
        if (editYear.trim() !== "") {
          formData.append("year", editYear.trim());
        }
        if (editSemester.trim() !== "") {
          formData.append("semester", editSemester.trim());
        }
        await appendProfileImageField(formData, pickedProfileImage);
        ({ user: updated } = await updateMyProfile(formData));
      } else {
        const payload = {
          name: editName.trim(),
          contactNo: editContactNo.trim(),
          guardianName: editGuardianName.trim(),
          guardianContact: editGuardianContact.trim(),
        };
        if (editYear.trim() !== "") {
          payload.year = Number(editYear.trim());
        }
        if (editSemester.trim() !== "") {
          payload.semester = Number(editSemester.trim());
        }
        ({ user: updated } = await updateMyProfile(payload));
      }
      if (updated) {
        setUser(updated);
        await storage.setUser(updated);
      } else {
        await loadProfile();
      }
      setEditing(false);
      setPickedProfileImage(null);
      Alert.alert("Saved", "Your profile was updated.");
    } catch (e) {
      Alert.alert("Could not save", getAuthErrorMessage(e));
    } finally {
      setSaveProfileLoading(false);
    }
  }

  function openDeleteModal() {
    setDeletePassword("");
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteModalOpen(false);
    setDeletePassword("");
  }

  async function confirmDeleteAccount() {
    if (!deletePassword.trim()) {
      Alert.alert("Validation", "Enter your password to confirm.");
      return;
    }
    try {
      setDeleteSubmitting(true);
      await deleteAccount({ password: deletePassword });
      await storage.clear();
      setDeleteModalOpen(false);
      router.replace("/login");
    } catch (e) {
      Alert.alert("Could not delete account", getAuthErrorMessage(e));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function closePwdModal() {
    if (pwdSubmitting) return;
    setPwdModalOpen(false);
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
  }

  async function submitPasswordChange() {
    if (!pwdCurrent.trim()) {
      Alert.alert("Validation", "Enter your current password.");
      return;
    }
    if (!pwdNew.trim()) {
      Alert.alert("Validation", "Enter a new password.");
      return;
    }
    if (pwdNew.trim().length < MIN_NEW_PASSWORD_LEN) {
      Alert.alert(
        "Validation",
        `New password must be at least ${MIN_NEW_PASSWORD_LEN} characters.`,
      );
      return;
    }
    if (pwdNew !== pwdConfirm) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }
    try {
      setPwdSubmitting(true);
      await changePassword({
        currentPassword: pwdCurrent,
        newPassword: pwdNew.trim(),
      });
      closePwdModal();
      Alert.alert("Success", "Your password was updated.");
    } catch (e) {
      Alert.alert("Could not update password", getAuthErrorMessage(e));
    } finally {
      setPwdSubmitting(false);
    }
  }

  const avatarDisplayUri = pickedProfileImage?.uri ?? user?.profileImage;

  if (loading && !user) {
    return (
      <View style={styles.root}>
        <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
          <View style={styles.headerBar}>
            <Pressable
              style={styles.headerIconWrap}
              onPress={handleBack}
              hitSlop={10}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </Pressable>
            <View style={styles.headerIconWrap} />
            <View style={styles.headerTitleSlot} pointerEvents="none">
              <Text style={styles.headerTitleCenter} numberOfLines={1}>
                Profile
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.loadingWrap, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingHint}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <Pressable
            style={styles.headerIconWrap}
            onPress={handleBack}
            hitSlop={10}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <View style={styles.headerIconWrap} />
          <View style={styles.headerTitleSlot} pointerEvents="none">
            <Text style={styles.headerTitleCenter} numberOfLines={1}>
              Profile
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadProfile}
            tintColor={COLORS.primary}
          />
        }
      >
        {error !== "" ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.editBar}>
          {!editing ? (
            <Pressable style={styles.editBtn} onPress={beginEdit}>
              <Text style={styles.editBtnText}>Edit profile</Text>
            </Pressable>
          ) : (
            <View style={styles.editBarRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={cancelEdit}
                disabled={saveProfileLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveBtn,
                  saveProfileLoading && styles.saveBtnDisabled,
                ]}
                onPress={saveProfile}
                disabled={saveProfileLoading}
              >
                {saveProfileLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.header}>
          {avatarDisplayUri ? (
            <Image
              source={{ uri: avatarDisplayUri }}
              style={styles.avatarPhoto}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Image
              source={accountSource}
              style={styles.avatarPlaceholder}
              contentFit="contain"
            />
          )}
          {editing ? (
            <Pressable style={styles.changePhotoBtn} onPress={pickProfilePhoto}>
              <Text style={styles.changePhotoText}>Change photo</Text>
            </Pressable>
          ) : null}
          {!editing ? (
            <>
              <Text style={styles.name}>{user?.name ?? "Student"}</Text>
              <Text style={styles.email}>{user?.email ?? ""}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <SectionTitle>Personal</SectionTitle>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
                editable={!saveProfileLoading}
              />
            </>
          ) : (
            <InfoRow label="Full name" value={dash(user?.name)} />
          )}
          <InfoRow label="Email" value={dash(user?.email)} />
          <InfoRow label="Gender" value={formatGender(user?.gender)} />
        </View>

        <View style={styles.card}>
          <SectionTitle>Academic</SectionTitle>
          <InfoRow label="Student ID" value={dash(user?.studentId)} />
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Year</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.selectTrigger,
                  pressed && styles.selectTriggerPressed,
                  saveProfileLoading && styles.selectTriggerDisabled,
                ]}
                onPress={() => !saveProfileLoading && setAcademicPicker("year")}
                disabled={saveProfileLoading}
              >
                <Text
                  style={[
                    styles.selectTriggerText,
                    editYear === "" && styles.selectTriggerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {editYear === "" ? "Select year" : String(editYear)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                Semester
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.selectTrigger,
                  pressed && styles.selectTriggerPressed,
                  saveProfileLoading && styles.selectTriggerDisabled,
                ]}
                onPress={() =>
                  !saveProfileLoading && setAcademicPicker("semester")
                }
                disabled={saveProfileLoading}
              >
                <Text
                  style={[
                    styles.selectTriggerText,
                    editSemester === "" && styles.selectTriggerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {editSemester === "" ? "Select semester" : String(editSemester)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textMuted}
                />
              </Pressable>
            </>
          ) : (
            <>
              <InfoRow
                label="Year"
                value={
                  user?.year != null && user.year !== ""
                    ? String(user.year)
                    : "—"
                }
              />
              <InfoRow
                label="Semester"
                value={
                  user?.semester != null && user.semester !== ""
                    ? String(user.semester)
                    : "—"
                }
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <SectionTitle>Contact</SectionTitle>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={editContactNo}
                onChangeText={setEditContactNo}
                placeholder="Contact number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!saveProfileLoading}
              />
            </>
          ) : (
            <InfoRow label="Phone" value={dash(user?.contactNo)} />
          )}
        </View>

        <View style={styles.card}>
          <SectionTitle>Guardian</SectionTitle>
          {editing ? (
            <>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editGuardianName}
                onChangeText={setEditGuardianName}
                placeholder="Guardian name"
                placeholderTextColor="#9CA3AF"
                editable={!saveProfileLoading}
              />
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                Contact
              </Text>
              <TextInput
                style={styles.textInput}
                value={editGuardianContact}
                onChangeText={setEditGuardianContact}
                placeholder="Guardian contact"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!saveProfileLoading}
              />
            </>
          ) : (
            <>
              <InfoRow label="Name" value={dash(user?.guardianName)} />
              <InfoRow label="Contact" value={dash(user?.guardianContact)} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <SectionTitle>Account</SectionTitle>
          <InfoRow
            label="Role"
            value={user?.role ? String(user.role) : "—"}
          />
          <InfoRow
            label="Status"
            value={
              user?.isApproved === true
                ? "Approved"
                : user?.isApproved === false
                  ? "Pending approval"
                  : "—"
            }
          />
          <InfoRow label="Joined" value={formatDate(user?.createdAt)} />
        </View>

        <Pressable
          style={styles.changePwdBtn}
          onPress={() => setPwdModalOpen(true)}
        >
          <Text style={styles.changePwdText}>Change password</Text>
        </Pressable>

        {(user?.profileImage || user?.idCardImage) && (
          <View style={styles.card}>
            <SectionTitle>Documents</SectionTitle>
            <Text style={styles.docHint}>
              Tap a preview to open in the browser.
            </Text>
            {user?.profileImage ? (
              <View style={styles.docBlock}>
                <Text style={styles.docLabel}>Profile photo</Text>
                <Pressable
                  onPress={() => Linking.openURL(user.profileImage)}
                  style={styles.docPress}
                >
                  <Image
                    source={{ uri: user.profileImage }}
                    style={styles.docThumb}
                    contentFit="cover"
                  />
                </Pressable>
              </View>
            ) : null}
            {user?.idCardImage ? (
              <View style={styles.docBlock}>
                <Text style={styles.docLabel}>ID card</Text>
                <Pressable
                  onPress={() => Linking.openURL(user.idCardImage)}
                  style={styles.docPress}
                >
                  <Image
                    source={{ uri: user.idCardImage }}
                    style={styles.docThumb}
                    contentFit="cover"
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.deleteAccountBtn,
            pressed && !deleteSubmitting && styles.deleteAccountBtnPressed,
          ]}
          onPress={openDeleteModal}
          disabled={deleteSubmitting}
        >
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={pwdModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closePwdModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change password</Text>
            <Text style={styles.modalBody}>
              Enter your current password and a new password (at least{" "}
              {MIN_NEW_PASSWORD_LEN} characters).
            </Text>
            <Text style={styles.modalLabel}>Current password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Current password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              value={pwdCurrent}
              onChangeText={setPwdCurrent}
              editable={!pwdSubmitting}
            />
            <Text style={styles.modalLabel}>New password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              value={pwdNew}
              onChangeText={setPwdNew}
              editable={!pwdSubmitting}
            />
            <Text style={styles.modalLabel}>Confirm new password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              value={pwdConfirm}
              onChangeText={setPwdConfirm}
              editable={!pwdSubmitting}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={closePwdModal}
                disabled={pwdSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimary,
                  pwdSubmitting && styles.modalDeleteDisabled,
                ]}
                onPress={submitPasswordChange}
                disabled={pwdSubmitting}
              >
                {pwdSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Update</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={academicPicker != null}
        transparent
        animationType="slide"
        onRequestClose={() => setAcademicPicker(null)}
      >
        <View style={styles.academicPickerRoot}>
          <Pressable
            style={styles.academicPickerBackdrop}
            onPress={() => setAcademicPicker(null)}
          />
          <View
            style={[
              styles.academicPickerSheet,
              { paddingBottom: 12 + insets.bottom },
            ]}
          >
            <View style={styles.academicPickerHeader}>
              <Text style={styles.academicPickerTitle}>
                {academicPicker === "year" ? "Year" : "Semester"}
              </Text>
              <Pressable
                onPress={() => setAcademicPicker(null)}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.academicPickerScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.academicPickerRow,
                  pressed && styles.academicPickerRowPressed,
                ]}
                onPress={() => {
                  if (academicPicker === "year") setEditYear("");
                  else setEditSemester("");
                  setAcademicPicker(null);
                }}
              >
                <Text style={styles.academicPickerRowMuted}>Not set</Text>
              </Pressable>
              {(academicPicker === "year" ? yearOptions : semesterOptions).map(
                (n) => {
                  const str = String(n);
                  const selected =
                    academicPicker === "year"
                      ? editYear === str
                      : editSemester === str;
                  return (
                    <Pressable
                      key={n}
                      style={({ pressed }) => [
                        styles.academicPickerRow,
                        pressed && styles.academicPickerRowPressed,
                        selected && styles.academicPickerRowSelected,
                      ]}
                      onPress={() => {
                        if (academicPicker === "year") setEditYear(str);
                        else setEditSemester(str);
                        setAcademicPicker(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.academicPickerRowText,
                          selected && styles.academicPickerRowTextSelected,
                        ]}
                      >
                        {n}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={22}
                          color={COLORS.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                },
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This permanently removes your account and related data. This
              cannot be undone.
            </Text>
            <Text style={styles.modalLabel}>Confirm with your password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!deleteSubmitting}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={closeDeleteModal}
                disabled={deleteSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDelete,
                  deleteSubmitting && styles.modalDeleteDisabled,
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
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
    backgroundColor: COLORS.studentScreenBackground,
  },
  /** Top app bar: solid white, hairline divider, iOS-style alignment */
  headerWrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: 4,
    backgroundColor: COLORS.white,
  },
  headerIconWrap: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  headerTitleSlot: {
    position: "absolute",
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  headerTitleCenter: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.35,
    color: COLORS.textPrimary,
    textAlign: "center",
    textAlignVertical: "center",
    width: "100%",
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingHint: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorBanner: {
    backgroundColor: COLORS.maintenanceBg,
    borderWidth: 1,
    borderColor: COLORS.maintenanceBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.maintenance,
  },
  editBar: {
    marginBottom: 12,
  },
  editBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  editBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.primary,
  },
  editBarRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    alignItems: "center",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textMuted,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.75,
  },
  saveBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPhoto: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 8,
  },
  changePhotoBtn: {
    marginBottom: 8,
  },
  changePhotoText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.primary,
  },
  name: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  fieldLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldLabelSpaced: {
    marginTop: 10,
  },
  textInput: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.inputBg,
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg,
    marginBottom: 12,
  },
  selectTriggerPressed: {
    opacity: 0.92,
  },
  selectTriggerDisabled: {
    opacity: 0.65,
  },
  selectTriggerText: {
    flex: 1,
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  selectTriggerPlaceholder: {
    color: "#9CA3AF",
  },
  academicPickerRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  academicPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  academicPickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "55%",
    paddingTop: 4,
  },
  academicPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  academicPickerTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  academicPickerScroll: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  academicPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  academicPickerRowPressed: {
    backgroundColor: COLORS.inputBg,
  },
  academicPickerRowSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  academicPickerRowText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  academicPickerRowTextSelected: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.primary,
  },
  academicPickerRowMuted: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 16,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rowValue: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  changePwdBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  changePwdText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.primary,
  },
  docHint: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  docBlock: {
    marginBottom: 14,
  },
  docLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  docPress: {
    alignSelf: "flex-start",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docThumb: {
    width: 200,
    height: 120,
    backgroundColor: COLORS.inputBg,
  },
  deleteAccountBtn: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.maintenanceBorder,
    backgroundColor: COLORS.maintenanceBg,
    alignItems: "center",
  },
  deleteAccountBtnPressed: {
    opacity: 0.88,
  },
  deleteAccountText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.maintenance,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalBody: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  modalInput: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg,
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: COLORS.textMuted,
  },
  modalPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  modalDelete: {
    backgroundColor: COLORS.maintenance,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteDisabled: {
    opacity: 0.7,
  },
  modalDeleteText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
