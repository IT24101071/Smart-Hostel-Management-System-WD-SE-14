import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEYS = {
  TOKEN: "auth_token",
  USER: "auth_user",
} as const;

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "warden" | "admin";
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  async setToken(token: string): Promise<void> {
    await setItem(KEYS.TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return getItem(KEYS.TOKEN);
  },

  async deleteToken(): Promise<void> {
    await removeItem(KEYS.TOKEN);
  },

  async setUser(user: StoredUser): Promise<void> {
    await setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await getItem(KEYS.USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },

  async deleteUser(): Promise<void> {
    await removeItem(KEYS.USER);
  },

  async clear(): Promise<void> {
    await Promise.all([removeItem(KEYS.TOKEN), removeItem(KEYS.USER)]);
  },
};
