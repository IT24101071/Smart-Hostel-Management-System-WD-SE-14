import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = 5000;

/**
 * Parse host from Expo / Metro values like "192.168.1.5:8081" or "http://192.168.1.5:8081".
 * IPv6 bracket form is supported.
 */
function parseHostFromDebuggerValue(value) {
  if (!value || typeof value !== "string") return null;
  let s = value.trim();
  if (!s) return null;

  s = s.replace(/^https?:\/\//i, "");
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);

  if (s.startsWith("[")) {
    const end = s.indexOf("]");
    if (end > 0) return s.slice(1, end);
    return null;
  }

  const lastColon = s.lastIndexOf(":");
  if (lastColon > 0) {
    const maybePort = s.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      return s.slice(0, lastColon);
    }
  }

  return s || null;
}

/** Tunnel / Expo cloud hosts do not reach a local Node server on :5000 */
function isUnsuitableLocalApiHost(host) {
  if (!host) return true;
  const h = host.toLowerCase();
  if (h.includes(".exp.direct")) return true;
  if (h === "expo.dev" || h.endsWith(".expo.dev")) return true;
  if (h.includes("ngrok")) return true;
  return false;
}

function getDebuggerHostCandidates() {
  const c = Constants;
  return [
    c.expoGoConfig?.debuggerHost,
    c.expoConfig?.hostUri,
    c.manifest2?.extra?.expoGo?.debuggerHost,
    c.manifest?.debuggerHost,
  ].filter(Boolean);
}

function makeApiUrl(host) {
  if (!host) return null;
  return `http://${host}:${DEFAULT_API_PORT}/api`;
}

/**
 * Dev API URL:
 * 1. EXPO_PUBLIC_API_URL when set (explicit override).
 * 2. Same LAN host as Metro (Expo Go on a real phone).
 * 3. Emulator / localhost fallbacks.
 */
function resolveDevApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    if (__DEV__) {
      console.log("[API] Using dev API URL from EXPO_PUBLIC_API_URL:", fromEnv);
    }
    return fromEnv;
  }

  for (const raw of getDebuggerHostCandidates()) {
    const host = parseHostFromDebuggerValue(raw);
    if (host && !isUnsuitableLocalApiHost(host)) {
      const url = makeApiUrl(host);
      if (__DEV__) {
        console.log("[API] Using dev API URL from Expo debugger host:", url);
      }
      return url;
    }
  }

  if (Platform.OS === "android") {
    const url = `http://10.0.2.2:${DEFAULT_API_PORT}/api`;
    if (__DEV__) {
      console.log("[API] Using Android emulator fallback:", url);
    }
    return url;
  }

  const url = `http://localhost:${DEFAULT_API_PORT}/api`;
  if (__DEV__) {
    console.log("[API] Using localhost fallback:", url);
  }
  return url;
}

function buildDevApiCandidates() {
  const candidates = [];
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) candidates.push(fromEnv);

  for (const raw of getDebuggerHostCandidates()) {
    const host = parseHostFromDebuggerValue(raw);
    if (!host || isUnsuitableLocalApiHost(host)) continue;
    const url = makeApiUrl(host);
    if (url) candidates.push(url);
  }

  if (Platform.OS === "android") {
    candidates.push(`http://10.0.2.2:${DEFAULT_API_PORT}/api`);
    candidates.push(`http://127.0.0.1:${DEFAULT_API_PORT}/api`);
    candidates.push(`http://localhost:${DEFAULT_API_PORT}/api`);
  } else {
    candidates.push(`http://localhost:${DEFAULT_API_PORT}/api`);
    candidates.push(`http://127.0.0.1:${DEFAULT_API_PORT}/api`);
  }

  // Keep order, remove duplicates.
  return [...new Set(candidates.filter(Boolean))];
}

export const API_BASE_URL = __DEV__
  ? resolveDevApiUrl()
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api");

export const API_BASE_URL_CANDIDATES = __DEV__
  ? buildDevApiCandidates()
  : [API_BASE_URL];

export function getNextApiBaseUrl(currentBaseUrl) {
  const current = String(currentBaseUrl || "");
  const list = API_BASE_URL_CANDIDATES;
  const idx = list.indexOf(current);
  if (idx < 0) return list[0] || null;
  return list[idx + 1] || null;
}

export const API_TIMEOUT_MS = 10_000;
