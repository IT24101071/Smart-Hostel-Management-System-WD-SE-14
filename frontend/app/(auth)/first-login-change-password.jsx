import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
  changeFirstLoginPassword,
  getAuthErrorMessage,
} from "../../services/auth.service";

const MIN_PASSWORD_LEN = 8;

export default function FirstLoginChangePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = useMemo(
    () => String(params?.email ?? "").trim().toLowerCase(),
    [params?.email],
  );
  const hint = useMemo(() => String(params?.hint ?? "").trim(), [params?.hint]);

  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempPasswordVisible, setTempPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email) {
      setError("Missing account email. Please sign in again.");
      return;
    }
    if (!tempPassword.trim()) {
      setError("Please enter your temporary password.");
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
      const result = await changeFirstLoginPassword({
        email,
        currentPassword: tempPassword,
        newPassword: newPassword.trim(),
      });
      Alert.alert(
        "Success",
        result?.message || "Password changed successfully. Account is now active.",
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
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
                onPress={() => router.replace("/login")}
                style={styles.backBtn}
                hitSlop={12}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              </Pressable>
              <Text style={styles.title}>Activate account</Text>
              <View style={styles.backPlaceholder} />
            </View>

            <Text style={styles.subtitle}>
              {hint ||
                "Set a new password to activate your account before first use."}
            </Text>
            <Text style={styles.emailText}>{email || "--"}</Text>

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

            <Field
              label="Temporary password"
              value={tempPassword}
              onChangeText={setTempPassword}
              secureTextEntry={!tempPasswordVisible}
              onToggleVisibility={() => setTempPasswordVisible((v) => !v)}
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!newPasswordVisible}
              onToggleVisibility={() => setNewPasswordVisible((v) => !v)}
            />
            <Field
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!confirmVisible}
              onToggleVisibility={() => setConfirmVisible((v) => !v)}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.primaryButtonPressed,
                loading && styles.primaryButtonLoading,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Change password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  onToggleVisibility,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
        />
        <Pressable onPress={onToggleVisibility} style={styles.eyeButton} hitSlop={8}>
          <Ionicons
            name={secureTextEntry ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#9CA3AF"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C8DAEA" },
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
    marginBottom: 6,
    lineHeight: 20,
  },
  emailText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primary,
    marginBottom: 14,
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
  fieldGroup: { marginBottom: 16 },
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
  passwordInput: { letterSpacing: 1 },
  eyeButton: { padding: 4 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonPressed: { backgroundColor: COLORS.primaryDark, opacity: 0.95 },
  primaryButtonLoading: { opacity: 0.75 },
  primaryButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
