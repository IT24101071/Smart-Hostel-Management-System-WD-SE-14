import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import {
  requestSignupOtp,
  getAuthErrorMessage,
  checkRegisterAvailability,
} from "../../services/auth.service";
import {
  ROOM_GENDERS,
  ROOM_GENDER_LABELS,
} from "../../types/room";
import {
  SIGNUP_PHONE_PREFIX,
  SIGNUP_LOCAL_PHONE_DIGITS,
  normalizeSignupEmail,
  validateSignupNameTyping,
  validateSignupEmailTyping,
  validateSignupPasswordTyping,
  validateSignupPhoneDigitsTyping,
  validateSignupName,
  validateSignupEmailFormat,
  validateSignupPassword,
  validateSignupPhoneDigits,
  validateSignupStudentId,
  digitsToFullPhone,
} from "../../utils/signupValidation";

const YEARS = ["1", "2", "3", "4"];
const SEMESTERS = ["1", "2"];
const ERROR_TEXT = "#DC2626";

function inferMimeTypeFromAsset(asset, fallbackName) {
  const candidateMime = String(asset?.mimeType || "").toLowerCase().trim();
  if (candidateMime.startsWith("image/")) return candidateMime;

  const name =
    String(asset?.fileName || fallbackName || "")
      .trim()
      .toLowerCase() || "";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function trimDigits(text) {
  return String(text ?? "")
    .replace(/\D/g, "")
    .slice(0, SIGNUP_LOCAL_PHONE_DIGITS);
}

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  const [contactDigits, setContactDigits] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContactDigits, setGuardianContactDigits] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [gender, setGender] = useState("male");
  const [genderOpen, setGenderOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [emailTaken, setEmailTaken] = useState(null);
  const [studentIdTaken, setStudentIdTaken] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingStudentId, setCheckingStudentId] = useState(false);

  const fullNameErr = validateSignupNameTyping(fullName, "Full name");
  const emailFmtErr = validateSignupEmailTyping(email);
  const passwordErr = validateSignupPasswordTyping(password);
  const contactErr = validateSignupPhoneDigitsTyping(contactDigits);
  const guardianNameErr = validateSignupNameTyping(guardianName, "Guardian name");
  const guardianContactErr =
    validateSignupPhoneDigitsTyping(guardianContactDigits);

  const strictRegexOk = useMemo(() => {
    return (
      validateSignupName(fullName, "Full name").ok &&
      validateSignupEmailFormat(email).ok &&
      validateSignupStudentId(studentId).ok &&
      validateSignupPassword(password).ok &&
      validateSignupPhoneDigits(contactDigits).ok &&
      validateSignupPhoneDigits(guardianContactDigits, "Guardian contact")
        .ok &&
      validateSignupName(guardianName, "Guardian name").ok &&
      ROOM_GENDERS.includes(gender)
    );
  }, [
    fullName,
    email,
    studentId,
    password,
    contactDigits,
    guardianContactDigits,
    guardianName,
    gender,
  ]);

  const availabilityBlocksSubmit =
    checkingEmail ||
    checkingStudentId ||
    emailTaken === true ||
    studentIdTaken === true;

  const canSubmit =
    strictRegexOk &&
    !!profileImage &&
    !!idCardImage &&
    agreedToTerms &&
    !availabilityBlocksSubmit &&
    !loading;

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setProfileImage({
        uri: asset.uri,
        type: inferMimeTypeFromAsset(asset, "profile.jpg"),
        name: asset.fileName || "profile.jpg",
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
      const asset = result.assets[0];
      setIdCardImage({
        uri: asset.uri,
        type: inferMimeTypeFromAsset(asset, "idcard.jpg"),
        name: asset.fileName || "idcard.jpg",
      });
    }
  };

  const runEmailAvailability = async () => {
    const fmt = validateSignupEmailFormat(email);
    if (!fmt.ok) return;
    setCheckingEmail(true);
    try {
      const r = await checkRegisterAvailability({
        email: normalizeSignupEmail(email),
      });
      setEmailTaken(r.emailTaken === true ? true : false);
    } catch {
      setEmailTaken(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const runStudentIdAvailability = async () => {
    const sid = studentId.trim();
    if (!sid) return;
    setCheckingStudentId(true);
    try {
      const r = await checkRegisterAvailability({ studentId: sid });
      setStudentIdTaken(r.studentIdTaken === true ? true : false);
    } catch {
      setStudentIdTaken(null);
    } finally {
      setCheckingStudentId(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit && !loading) return;

    setLoading(true);
    try {
      const avail = await checkRegisterAvailability({
        email: normalizeSignupEmail(email),
        studentId: studentId.trim(),
      });
      if (avail.emailTaken) {
        setEmailTaken(true);
        setLoading(false);
        return;
      }
      setEmailTaken(false);
      if (avail.studentIdTaken) {
        setStudentIdTaken(true);
        setLoading(false);
        return;
      }
      setStudentIdTaken(false);

      const contactNo = digitsToFullPhone(contactDigits);
      const guardianContact = digitsToFullPhone(guardianContactDigits);

      const response = await requestSignupOtp({
        name: fullName,
        email,
        password,
        studentId,
        year: parseInt(year, 10),
        semester: parseInt(semester, 10),
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

      Alert.alert(
        "OTP Sent",
        response.message || "Check your email for the OTP.",
      );
      router.push({
        pathname: "/signup-verify-otp",
        params: { email: normalizeSignupEmail(email) },
      });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const emailErrorLine = emailTaken
    ? "This email is already registered"
    : !emailFmtErr.ok
      ? emailFmtErr.message
      : null;

  const studentIdErrorLine = studentIdTaken
    ? "This student ID is already registered"
    : null;

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

      <FieldGroup
        label="Full Name"
        errorText={!fullNameErr.ok ? fullNameErr.message : null}
      >
        <InputRow
          icon="person-outline"
          placeholder="John Doe"
          value={fullName}
          onChangeText={setFullName}
          hasError={!fullNameErr.ok}
        />
      </FieldGroup>

      <FieldGroup
        label="University Email"
        errorText={emailErrorLine}
        helperText={checkingEmail ? "Checking availability…" : null}
      >
        <InputRow
          icon="mail-outline"
          placeholder="student@university.edu"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setEmailTaken(null);
          }}
          onBlur={runEmailAvailability}
          keyboardType="email-address"
          autoCapitalize="none"
          hasError={Boolean(emailErrorLine)}
        />
      </FieldGroup>

      <FieldGroup
        label="Student ID"
        errorText={studentIdErrorLine}
        helperText={checkingStudentId ? "Checking availability…" : null}
      >
        <View style={styles.splitRow}>
          <View style={styles.splitInput}>
            <InputRow
              icon="card-outline"
              placeholder="e.g., STU123456"
              value={studentId}
              onChangeText={(t) => {
                setStudentId(t);
                setStudentIdTaken(null);
              }}
              onBlur={runStudentIdAvailability}
              hasError={Boolean(studentIdErrorLine)}
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

      <FieldGroup
        label="Contact No"
        errorText={!contactErr.ok ? contactErr.message : null}
      >
        <PhoneDigitsRow
          value={contactDigits}
          onChangeText={(t) => setContactDigits(trimDigits(t))}
          hasError={!contactErr.ok}
        />
      </FieldGroup>

      <FieldGroup
        label="Password"
        errorText={!passwordErr.ok ? passwordErr.message : null}
      >
        <View
          style={[
            styles.inputRow,
            !passwordErr.ok && styles.inputRowError,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color="#9CA3AF"
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Letter, number, special char; min 7 characters"
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

      <FieldGroup
        label="Guardian Name"
        errorText={!guardianNameErr.ok ? guardianNameErr.message : null}
      >
        <InputRow
          icon="people-outline"
          placeholder="e.g., Mother/Father"
          value={guardianName}
          onChangeText={setGuardianName}
          hasError={!guardianNameErr.ok}
        />
      </FieldGroup>

      <FieldGroup
        label="Guardian Contact"
        errorText={!guardianContactErr.ok ? guardianContactErr.message : null}
      >
        <PhoneDigitsRow
          value={guardianContactDigits}
          onChangeText={(t) => setGuardianContactDigits(trimDigits(t))}
          hasError={!guardianContactErr.ok}
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
          (!canSubmit || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Send OTP</Text>
        )}
      </Pressable>
    </View>
  );
}

function FieldGroup({ label, children, errorText, helperText }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {helperText ? (
        <Text style={styles.fieldHelper}>{helperText}</Text>
      ) : null}
      {errorText ? (
        <Text style={styles.fieldError}>{errorText}</Text>
      ) : null}
    </View>
  );
}

function PhoneDigitsRow({ value, onChangeText, hasError }) {
  return (
    <View style={[styles.inputRow, hasError && styles.inputRowError]}>
      <Text style={styles.phonePrefix}>{SIGNUP_PHONE_PREFIX}</Text>
      <TextInput
        style={[styles.input, styles.phoneDigitsInput]}
        placeholder={"9".repeat(SIGNUP_LOCAL_PHONE_DIGITS)}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType="phone-pad"
        maxLength={SIGNUP_LOCAL_PHONE_DIGITS}
        autoCorrect={false}
      />
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
  onBlur,
  hasError,
}) {
  return (
    <View style={[styles.inputRow, hasError && styles.inputRowError]}>
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
        onBlur={onBlur}
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
  fieldError: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: ERROR_TEXT,
    marginTop: 4,
  },
  fieldHelper: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
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
  inputRowError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
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
  phonePrefix: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: "#374151",
    marginRight: 8,
    minWidth: 36,
  },
  phoneDigitsInput: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
  },
  splitRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
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
    opacity: 0.45,
  },
  submitButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
