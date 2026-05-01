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
import { getAuthErrorMessage, verifySignupOtp } from "../../services/auth.service";

export default function SignupVerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = useMemo(
    () => String(params?.email ?? "").trim().toLowerCase(),
    [params?.email],
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerifyOtp() {
    setError("");
    if (!email) {
      setError("Missing email. Please go back to signup and try again.");
      return;
    }
    const code = otp.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    try {
      setLoading(true);
      const response = await verifySignupOtp({ email, otp: code });
      Alert.alert("Success", response?.message || "Registered successfully.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
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
                onPress={() => router.back()}
                style={styles.backBtn}
                hitSlop={12}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              </Pressable>
              <Text style={styles.title}>Enter code</Text>
              <View style={styles.backPlaceholder} />
            </View>

            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email || "your email"}.
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Verification code</Text>
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
                    if (error) setError("");
                  }}
                  editable={!loading}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.primaryButtonPressed,
                loading && styles.primaryButtonLoading,
              ]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify OTP & Create Account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.replace("/signup")}
              disabled={loading}
              style={styles.secondaryLink}
            >
              <Text style={styles.secondaryLinkText}>Back to signup to resend OTP</Text>
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
