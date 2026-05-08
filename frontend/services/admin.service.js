import { AxiosError } from "axios";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import apiClient from "../lib/axios";
import { storage } from "../lib/storage";

function mapAdmin(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.id ?? item._id,
  };
}

export async function getAdmins() {
  const { data } = await apiClient.get("/auth/users", {
    params: { role: "admin" },
  });
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list.map(mapAdmin).filter(Boolean);
}

export async function searchAdmins(query) {
  const { data } = await apiClient.get("/auth/users", {
    params: {
      role: "admin",
      search: String(query ?? "").trim() || undefined,
    },
  });
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list.map(mapAdmin).filter(Boolean);
}

export async function getAdminMetrics() {
  const { data } = await apiClient.get("/auth/admin-metrics");
  return data?.data ?? data ?? {};
}

export async function getAllBookingsForAdmin() {
  const { data } = await apiClient.get("/payments/bookings");
  return data ?? {};
}

export async function cancelBookingAsAdmin(bookingId) {
  const { data } = await apiClient.post(
    `/bookings/${encodeURIComponent(String(bookingId))}/admin-cancel`,
  );
  return data;
}

export async function createAdmin(payload) {
  const { data } = await apiClient.post("/auth/create-admin", payload);
  return mapAdmin(data?.data ?? data?.admin ?? data?.user ?? data);
}

function mapWardenUser(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.id ?? item._id,
  };
}

export async function createWarden(payload) {
  if (!payload.nicPhoto?.uri) {
    const { data } = await apiClient.post("/auth/create-warden", {
      name: payload.name?.trim() ?? "",
      email: payload.email?.trim() ?? "",
      password: payload.password ?? "",
      nicNumber: payload.nicNumber?.trim() ?? "",
    });
    return mapWardenUser(data?.user);
  }

  const form = new FormData();
  form.append("name", payload.name?.trim() ?? "");
  form.append("email", payload.email?.trim() ?? "");
  form.append("password", payload.password ?? "");
  form.append("nicNumber", payload.nicNumber?.trim() ?? "");
  form.append(
    "nicPhoto",
    await normalizeUploadFile(payload.nicPhoto, "nic-photo"),
  );
  const data = await postMultipartWithAuth("/auth/create-warden", form);
  return mapWardenUser(data?.user);
}

export async function updateWarden(id, payload) {
  const hasNicPhoto = Boolean(payload.nicPhoto?.uri);
  if (hasNicPhoto) {
    const form = new FormData();
    if (payload.name !== undefined) {
      form.append("name", String(payload.name ?? "").trim());
    }
    if (payload.email !== undefined) {
      form.append("email", String(payload.email ?? "").trim());
    }
    if (payload.password !== undefined && String(payload.password).trim() !== "") {
      form.append("password", String(payload.password));
    }
    if (payload.nicNumber !== undefined) {
      form.append("nicNumber", String(payload.nicNumber ?? "").trim());
    }
    form.append(
      "nicPhoto",
      await normalizeUploadFile(payload.nicPhoto, "nic-photo"),
    );
    const data = await patchMultipartWithAuth(
      `/auth/users/${encodeURIComponent(String(id))}`,
      form,
    );
    return mapWardenUser(data?.user);
  }
  const body = {};
  if (payload.name !== undefined) body.name = payload.name?.trim();
  if (payload.email !== undefined) body.email = payload.email?.trim();
  if (payload.password !== undefined && payload.password !== "") {
    body.password = payload.password;
  }
  if (payload.nicNumber !== undefined) body.nicNumber = payload.nicNumber?.trim();
  const { data } = await apiClient.patch(
    `/auth/users/${encodeURIComponent(String(id))}`,
    body,
  );
  return mapWardenUser(data?.user);
}

export async function updateAdmin(id, payload) {
  const { data } = await apiClient.patch(
    `/auth/users/${encodeURIComponent(String(id))}`,
    payload,
  );
  return mapAdmin(data?.data ?? data?.admin ?? data?.user ?? data);
}

export async function deleteAdmin(id) {
  const { data } = await apiClient.delete(
    `/auth/users/${encodeURIComponent(String(id))}`,
  );
  return data;
}

export async function setAdminStatus(id, isApproved) {
  const { data } = await apiClient.patch(
    `/auth/users/${encodeURIComponent(String(id))}`,
    { isApproved: Boolean(isApproved) },
  );
  return mapAdmin(data?.data ?? data?.admin ?? data?.user ?? data);
}

export async function getFilteredAdminAuditLogs(filters = {}) {
  const { data } = await apiClient.get("/auth/admin-audit-logs", {
    params: {
      action: filters.action && filters.action !== "all" ? filters.action : undefined,
      actor: filters.actor?.trim() || undefined,
    },
  });
  return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
}

export function getAdminErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Could not reach admin services.";
  }
  return "Admin request failed.";
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

function resolveEndpoint(path) {
  const baseUrl = String(apiClient.defaults.baseURL || "").replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

async function postMultipartWithAuth(path, form) {
  const token = await storage.getToken();
  const res = await fetch(resolveEndpoint(path), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed with status ${res.status}`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

async function patchMultipartWithAuth(path, form) {
  const token = await storage.getToken();
  const res = await fetch(resolveEndpoint(path), {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed with status ${res.status}`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}
