import { AxiosError } from "axios";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import apiClient from "../lib/axios";
import { storage } from "../lib/storage";

export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", {
    email: payload.email?.trim(),
    password: payload.password ?? "",
  });
  return {
    token: data?.token,
    user: data?.user,
    passwordChangeRequired: Boolean(data?.passwordChangeRequired),
    message: data?.message,
  };
}

export async function checkRegisterAvailability({ email, studentId } = {}) {
  const params = {};
  if (email !== undefined && String(email).trim() !== "") {
    params.email = String(email).trim();
  }
  if (studentId !== undefined && String(studentId).trim() !== "") {
    params.studentId = String(studentId).trim();
  }
  const { data } = await apiClient.get("/auth/register/availability", {
    params,
  });
  return {
    emailTaken: data?.emailTaken,
    studentIdTaken: data?.studentIdTaken,
  };
}

export async function register(payload) {
  return requestSignupOtp(payload);
}

export async function requestSignupOtp(payload) {
  const form = new FormData();
  form.append("name", payload.name?.trim() ?? "");
  form.append("email", payload.email?.trim() ?? "");
  form.append("password", payload.password ?? "");
  form.append("studentId", payload.studentId?.trim() ?? "");
  form.append("year", String(payload.year ?? ""));
  form.append("semester", String(payload.semester ?? ""));
  form.append("gender", payload.gender ?? "");
  form.append("contactNo", payload.contactNo?.trim() ?? "");
  form.append("guardianName", payload.guardianName?.trim() ?? "");
  form.append("guardianContact", payload.guardianContact?.trim() ?? "");
  if (payload.profileImage) {
    form.append(
      "profileImage",
      await normalizeUploadFile(payload.profileImage, "profile"),
    );
  }
  if (payload.idCardImage) {
    form.append(
      "idCardImage",
      await normalizeUploadFile(payload.idCardImage, "idcard"),
    );
  }

  const baseUrl = String(apiClient.defaults.baseURL || "").replace(/\/$/, "");
  const endpoint = `${baseUrl}/auth/register/request-otp`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    const raw = await res.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const error = new Error(
        parsed?.message || `OTP request failed with status ${res.status}`,
      );
      error.response = {
        status: res.status,
        data: parsed ?? { message: raw || "OTP request failed" },
      };
      throw error;
    }

    return parsed ?? { message: "OTP sent to your email." };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function verifySignupOtp(payload) {
  const { data } = await apiClient.post("/auth/register/verify-otp", {
    email: payload.email?.trim().toLowerCase(),
    otp: String(payload.otp ?? "").trim(),
  });
  return data;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

async function normalizeUploadFile(file, label) {
  const uri = String(file?.uri || "");
  const type = String(file?.type || "image/jpeg");
  const ext = extFromMime(type);
  const name = String(file?.name || `${label}.${ext}`);

  if (
    Platform.OS === "android" &&
    uri.startsWith("content://") &&
    FileSystem.cacheDirectory
  ) {
    const cacheUri = `${FileSystem.cacheDirectory}${Date.now()}-${name}`;
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    return { uri: cacheUri, type, name };
  }

  return { uri, type, name };
}

export async function forgotPassword(payload) {
  const { data } = await apiClient.post("/auth/forgot-password", {
    email: payload.email?.trim().toLowerCase(),
  });
  return data;
}

export async function resetPassword(payload) {
  const { data } = await apiClient.post("/auth/reset-password", {
    email: payload.email?.trim().toLowerCase(),
    otp: String(payload.otp ?? "").trim(),
    newPassword: payload.newPassword ?? "",
  });
  return data;
}

export async function changeFirstLoginPassword(payload) {
  const { data } = await apiClient.post("/auth/first-login/change-password", {
    email: payload.email?.trim().toLowerCase(),
    currentPassword: payload.currentPassword ?? "",
    newPassword: payload.newPassword ?? "",
  });
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await apiClient.patch("/auth/me", payload);
  return data;
}

export async function changePassword(payload) {
  const { data } = await apiClient.patch("/auth/change-password", {
    currentPassword: payload.currentPassword ?? "",
    newPassword: payload.newPassword ?? "",
  });
  return data;
}

export async function deleteAccount(payload) {
  const { data } = await apiClient.delete("/auth/me", {
    data: { password: payload.password ?? "" },
  });
  await storage.clear();
  return data;
}

export function getAuthErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Could not reach the server. Please try again.";
  }
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (error?.name === "AbortError")
    return "Request timed out. Please check your network and try again.";
  if (error?.message) return error.message;
  return "Authentication request failed.";
}
