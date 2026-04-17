import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveDevApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000/api`;
  }

  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

export const API_BASE_URL = __DEV__
  ? resolveDevApiUrl()
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api");

export const API_TIMEOUT_MS = 10_000;
