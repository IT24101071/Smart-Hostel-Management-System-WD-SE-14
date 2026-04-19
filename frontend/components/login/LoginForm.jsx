import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { storage } from "../../lib/storage";
import { getAuthErrorMessage, login } from "../../services/auth.service";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearError() {
    if (error) setError("");
  }

  async function handleSignIn() {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const { token, user } = await login({ email: email.trim(), password });

      await storage.setToken(token);
      await storage.setUser(user);

      // Route based on user role
      if (user.role === "admin") {
        router.replace("/admin");
      } else if (user.role === "student") {
        if (!user.isApproved) {
          await storage.clear();
          setError(
            "Your account is pending approval. Please wait for admin confirmation.",
          );
          return;
        }
        router.replace("/student");
      } else if (user.role === "warden") {
        router.replace("/warden");
      } else {
        await storage.clear();
        setError("Invalid user role. Please contact support.");
        return;
      }
    } catch (err) {
      console.error("[LoginForm] Sign-in failed:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Sign In</Text>

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

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Password</Text>
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
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError();
            }}
            editable={!loading}
          />
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.eyeButton}
            hitSlop={8}
            disabled={loading}
          >
            <Ionicons
              name={passwordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#9CA3AF"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.optionsRow}>
        <Pressable
          style={styles.rememberRow}
          onPress={() => setRememberMe((v) => !v)}
          disabled={loading}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.rememberText}>Remember Me</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/forgot-password")}
          disabled={loading}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signInButton,
          pressed && !loading && styles.signInButtonPressed,
          loading && styles.signInButtonLoading,
        ]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.signInButtonText}>Sign In</Text>
        )}
      </Pressable>

      <View style={styles.createRow}>
        <Text style={styles.createText}>{"Don't have an account? "}</Text>
        <Pressable onPress={() => router.push("/signup")} disabled={loading}>
          <Text style={styles.createLink}>Create One</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: "#1C1B1F",
    marginBottom: 16,
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

  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "#374151",
  },
  forgotText: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 13,
    color: COLORS.primary,
  },

  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonPressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.95,
  },
  signInButtonLoading: {
    opacity: 0.75,
  },
  signInButtonText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  createRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: "#6B7280",
  },
  createLink: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primary,
  },
});
