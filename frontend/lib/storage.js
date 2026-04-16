import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEYS = {
  TOKEN: "auth_token",
  USER: "auth_user",
};

async function setItem(key, value) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  async setToken(token) {
    await setItem(KEYS.TOKEN, token);
  },

  async getToken() {
    return getItem(KEYS.TOKEN);
  },

  async deleteToken() {
    await removeItem(KEYS.TOKEN);
  },

  async setUser(user) {
    await setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser() {
    const raw = await getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  async deleteUser() {
    await removeItem(KEYS.USER);
  },

  async clear() {
    await Promise.all([removeItem(KEYS.TOKEN), removeItem(KEYS.USER)]);
  },
};
