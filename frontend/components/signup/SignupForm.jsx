import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../constants/colors";
import { register, getAuthErrorMessage } from "../../services/auth.service";
import {
  ROOM_GENDERS,
  ROOM_GENDER_LABELS,
} from "../../types/room";

const YEARS = ["1", "2", "3", "4"];
const SEMESTERS = ["1", "2"];

export default function SignupForm({ onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [gender, setGender] = useState("male");
  const [genderOpen, setGenderOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage({
        uri: result.assets[0].uri,
        type: result.assets[0].type || "image/jpeg",
        name: result.assets[0].fileName || "profile.jpg",
      });
    }
  };

  const pickIdCardImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setIdCardImage({
        uri: result.assets[0].uri,
        type: result.assets[0].type || "image/jpeg",
        name: result.assets[0].fileName || "idcard.jpg",
      });
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation", "Please enter your full name");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation", "Please enter your email");
      return;
    }
    if (!studentId.trim()) {
      Alert.alert("Validation", "Please enter your student ID");
      return;
    }
    if (!ROOM_GENDERS.includes(gender)) {
      Alert.alert("Validation", "Please select your gender");
      return;
    }
    if (!contactNo.trim()) {
      Alert.alert("Validation", "Please enter your contact number");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Validation", "Please enter a password");
      return;
    }
    if (!guardianName.trim()) {
      Alert.alert("Validation", "Please enter guardian name");
      return;
    }
    if (!guardianContact.trim()) {
      Alert.alert("Validation", "Please enter guardian contact");
      return;
    }
    if (!profileImage) {
      Alert.alert("Validation", "Please upload a profile picture");
      return;
    }
    if (!idCardImage) {
      Alert.alert("Validation", "Please upload your ID card image");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert("Validation", "Please agree to the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        name: fullName,
        email,
        password,
        studentId,
        year: parseInt(year),
        semester: parseInt(semester),
        gender,
        contactNo,
        guardianName,
        guardianContact,
        profileImage: {
          uri: profileImage.uri,
          type: profileImage.type,
          name: profileImage.name,
        },
        idCardImage: {
          uri: idCardImage.uri,
          type: idCardImage.type,
          name: idCardImage.name,
        },
      });

      Alert.alert("Success", response.message);
      onSuccess?.();
    } catch (error) {
      const message = getAuthErrorMessage(error);
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Create Account</Text>

      <View style={styles.avatarWrapper}>
        <Pressable style={styles.avatarUpload} onPress={pickProfileImage}>
          {profileImage ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={COLORS.primary}
              />
              <Text style={styles.avatarUploadText}>
                Profile Picture Selected
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={26} color="#9CA3AF" />
              <Text style={styles.avatarUploadText}>
                Upload Profile Picture
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <FieldGroup label="Full Name">
        <InputRow
          icon="person-outline"
          placeholder="John Doe"
          value={fullName}
          onChangeText={setFullName}
        />
      </FieldGroup>

      <FieldGroup label="University Email">
        <InputRow
          icon="mail-outline"
          placeholder="student@university.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FieldGroup>

      <FieldGroup label="Student ID">
        <View style={styles.splitRow}>
          <View style={styles.splitInput}>
            <InputRow
              icon="card-outline"
              placeholder="e.g., STU123456"
              value={studentId}
              onChangeText={setStudentId}
            />
          </View>
          <Pressable style={styles.uploadIdButton} onPress={pickIdCardImage}>
            <Ionicons
              name={idCardImage ? "checkmark-done" : "image-outline"}
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.uploadIdText}>
              {idCardImage ? "Card OK" : "Card"}
            </Text>
          </Pressable>
        </View>
      </FieldGroup>

      <View
        style={[
          styles.twoColumnRow,
          (yearOpen || semesterOpen) && styles.selectRowDropdownOpen,
        ]}
      >
        <View style={styles.column}>
          <Text style={styles.fieldLabel}>Year</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => {
              setYearOpen((v) => !v);
              setSemesterOpen(false);
              setGenderOpen(false);
            }}
          >
            <Text style={styles.selectValue}>{year}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </Pressable>
          {yearOpen && (
            <View style={styles.dropdown}>
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  style={[
                    styles.dropdownItem,
                    year === y && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setYear(y);
                    setYearOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      year === y && styles.dropdownTextActive,
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.column}>
          <Text style={styles.fieldLabel}>Semester</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => {
              setSemesterOpen((v) => !v);
              setYearOpen(false);
              setGenderOpen(false);
            }}
          >
            <Text style={styles.selectValue}>{semester}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </Pressable>
          {semesterOpen && (
            <View style={styles.dropdown}>
              {SEMESTERS.map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.dropdownItem,
                    semester === s && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSemester(s);
                    setSemesterOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      semester === s && styles.dropdownTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.genderRow,
          genderOpen && styles.selectRowDropdownOpen,
        ]}
      >
        <Text style={styles.fieldLabel}>Gender</Text>
        <Pressable
          style={styles.selectButtonFull}
          onPress={() => {
            setGenderOpen((v) => !v);
            setYearOpen(false);
            setSemesterOpen(false);
          }}
        >
          <Text style={styles.selectValue}>{ROOM_GENDER_LABELS[gender]}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
        {genderOpen && (
          <View style={styles.dropdownFullWidth}>
            {ROOM_GENDERS.map((g) => (
              <Pressable
                key={g}
                style={[
                  styles.dropdownItem,
                  gender === g && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setGender(g);
                  setGenderOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    gender === g && styles.dropdownTextActive,
                  ]}
                >
                  {ROOM_GENDER_LABELS[g]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FieldGroup label="Contact No">
        <InputRow
          icon="call-outline"
          placeholder="077xxxxxxx"
          value={contactNo}
          onChangeText={setContactNo}
          keyboardType="phone-pad"
        />
      </FieldGroup>

      <FieldGroup label="Password">
        <View style={styles.inputRow}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color="#9CA3AF"
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Min 6 characters"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
            autoCorrect={false}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? "eye-outline" : "eye-off-outline"}
              size={16}
              color="#9CA3AF"
            />
          </Pressable>
        </View>
      </FieldGroup>

      <View style={styles.dividerSection}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>Guardian Info</Text>
        <View style={styles.dividerLine} />
      </View>

      <FieldGroup label="Guardian Name">
        <InputRow
          icon="people-outline"
          placeholder="e.g., Mother/Father"
          value={guardianName}
          onChangeText={setGuardianName}
        />
      </FieldGroup>

      <FieldGroup label="Guardian Contact">
        <InputRow
          icon="call-outline"
          placeholder="077xxxxxxx"
          value={guardianContact}
          onChangeText={setGuardianContact}
          keyboardType="phone-pad"
        />
      </FieldGroup>

      <View style={styles.termsRow}>
        <Pressable
          style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          {agreedToTerms && (
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          )}
        </Pressable>
        <Text style={styles.termsText}>
          I agree to the{" "}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitButtonPressed,
          loading && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Create Account</Text>
        )}
      </Pressable>
    </View>
  );
}

function FieldGroup({ label, children }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}) {
  return (
    <View style={styles.inputRow}>
      <Ionicons
        name={icon}
        size={18}
        color="#9CA3AF"
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: "#1C1B1F",
    marginBottom: 20,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarUpload: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  avatarUploadText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 13.5,
    color: "#374151",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: "#1C1B1F",
    height: "100%",
  },
  passwordInput: {
    letterSpacing: 1,
  },
  eyeButton: {
    padding: 4,
  },
  splitRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  splitInput: {
    flex: 1,
  },
  uploadIdButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  uploadIdText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primary,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    position: "relative",
    zIndex: 5,
  },
  genderRow: {
    marginBottom: 14,
    position: "relative",
    zIndex: 4,
  },
  selectRowDropdownOpen: {
    marginBottom: 70,
  },
  column: {
    flex: 1,
    position: "relative",
    zIndex: 15,
  },
  selectButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
    width: "100%",
  },
  dropdownFullWidth: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 60,
    overflow: "hidden",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 46,
  },
  selectValue: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: "#1C1B1F",
  },
  dropdown: {
    position: "absolute",
    top: 70,
    left: -1,
    right: -1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 60,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  dropdownText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: "#374151",
  },
  dropdownTextActive: {
    color: COLORS.primary,
    fontFamily: "PublicSans_600SemiBold",
  },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: "#6B7280",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "#374151",
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: "PublicSans_600SemiBold",
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.95,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
