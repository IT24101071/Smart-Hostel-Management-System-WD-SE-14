import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import {
  forgotPassword,
  getAuthErrorMessage,
  resetPassword,
} from "../../services/auth.service";

const MIN_PASSWORD_LEN = 8;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  function clearError() {
    if (error) setError("");
  }

  async function handleSendCode() {
    setError("");
    if (!normalizedEmail) {
      setError("Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      await forgotPassword({ email: normalizedEmail });
      setStep(2);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function goNextFromOtp() {
    setError("");
    const code = otp.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setStep(3);
  }

  async function handleResetPassword() {
    setError("");
    const code = otp.trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.trim().length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword({
        email: normalizedEmail,
        otp: code,
        newPassword: newPassword.trim(),
      });
      Alert.alert("Success", "Your password has been updated.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === 1) {
      router.back();
    } else {
      setError("");
      setStep((s) => s - 1);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#C8DAEA" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.topBar}>
              <Pressable
                onPress={goBack}
                style={styles.backBtn}
                hitSlop={12}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              </Pressable>
              <Text style={styles.title}>
                {step === 1 && "Forgot password"}
                {step === 2 && "Enter code"}
                {step === 3 && "New password"}
              </Text>
              <View style={styles.backPlaceholder} />
            </View>

            <Text style={styles.subtitle}>
              {step === 1 &&
                "We will email you a code if an account exists for this address."}
              {step === 2 &&
                `Enter the 6-digit code sent to ${normalizedEmail || "your email"}.`}
              {step === 3 && "Choose a new password for your account."}
            </Text>

            {error !== "" && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={COLORS.maintenance}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {step === 1 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="it24xxxxxx@my.sliit.lk"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      clearError();
                    }}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Reset code</Text>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(t) => {
                      setOtp(t.replace(/\D/g, "").slice(0, 6));
                      clearError();
                    }}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {step === 3 && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>New password</Text>
                  <View style={styles.inputRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="••••••••••••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!newPasswordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        clearError();
                      }}
                      editable={!loading}
                    />
                    <Pressable
                      onPress={() => setNewPasswordVisible((v) => !v)}
                      style={styles.eyeButton}
                      hitSlop={8}
                      disabled={loading}
                    >
                      <Ionicons
                        name={newPasswordVisible ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Confirm password</Text>
                  <View style={styles.inputRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="••••••••••••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!confirmVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        clearError();
                      }}
                      editable={!loading}
                    />
                    <Pressable
                      onPress={() => setConfirmVisible((v) => !v)}
                      style={styles.eyeButton}
                      hitSlop={8}
                      disabled={loading}
                    >
                      <Ionicons
                        name={confirmVisible ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.primaryButtonPressed,
                loading && styles.primaryButtonLoading,
              ]}
              onPress={() => {
                if (step === 1) handleSendCode();
                else if (step === 2) goNextFromOtp();
                else handleResetPassword();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === 1 && "Send code"}
                  {step === 2 && "Continue"}
                  {step === 3 && "Update password"}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.replace("/login")}
              disabled={loading}
              style={styles.secondaryLink}
            >
              <Text style={styles.secondaryLinkText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C8DAEA",
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  backPlaceholder: { width: 30 },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: "#1C1B1F",
  },
  subtitle: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 18,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.maintenanceBg,
    borderWidth: 1,
    borderColor: COLORS.maintenanceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.maintenance,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 14,
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
    height: 48,
  },
  inputIcon: { marginRight: 10 },
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
  eyeButton: { padding: 4 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.95,
  },
  primaryButtonLoading: { opacity: 0.75 },
  primaryButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  secondaryLink: {
    alignItems: "center",
  },
  secondaryLinkText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.primary,
  },
});
