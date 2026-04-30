import { AxiosError } from "axios";
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
  };
}

export async function register(payload) {
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
    form.append("profileImage", payload.profileImage);
  }
  if (payload.idCardImage) {
    form.append("idCardImage", payload.idCardImage);
  }
  const { data } = await apiClient.post("/auth/register", form);
  return data;
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
  return "Authentication request failed.";
}
