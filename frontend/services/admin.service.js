import { AxiosError } from "axios";
import apiClient from "../lib/axios";

function getUserRecordId(user) {
  if (!user) return null;
  const raw = user._id ?? user.id;
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "$oid" in raw) {
    return String(raw.$oid);
  }
  return String(raw);
}

function mapAdmin(user) {
  return {
    ...user,
    id: getUserRecordId(user),
  };
}

export async function getAdmins() {
  const { data } = await apiClient.get("/auth/users", {
    params: { role: "admin" },
  });
  const users = Array.isArray(data) ? data : [];
  return users.filter((user) => user.role === "admin").map(mapAdmin);
}

export async function searchAdmins(search) {
  const { data } = await apiClient.get("/auth/users", {
    params: { role: "admin", search: search?.trim() || undefined },
  });
  const users = Array.isArray(data) ? data : [];
  return users.filter((user) => user.role === "admin").map(mapAdmin);
}

export async function createAdmin(values) {
  const { data } = await apiClient.post("/auth/create-admin", {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password,
    adminSecret: values.adminSecret.trim(),
  });
  return mapAdmin(data?.user || data);
}

export async function updateAdmin(id, values) {
  const payload = {
    name: values.name.trim(),
    email: values.email.trim(),
  };
  if (values.password?.trim()) {
    payload.password = values.password.trim();
  }
  const { data } = await apiClient.patch(
    `/auth/users/${encodeURIComponent(id)}`,
    payload,
  );
  return mapAdmin(data?.user || data);
}

export async function deleteAdmin(id) {
  await apiClient.delete(`/auth/users/${encodeURIComponent(id)}`);
}

export async function getAdminAuditLogs() {
  const { data } = await apiClient.get("/auth/admin-audit-logs");
  return Array.isArray(data) ? data : [];
}

export async function getFilteredAdminAuditLogs(filters = {}) {
  const params = {
    action: filters.action || undefined,
    actor: filters.actor || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const { data } = await apiClient.get("/auth/admin-audit-logs", { params });
  return Array.isArray(data) ? data : [];
}

export async function setAdminStatus(id, isApproved) {
  const { data } = await apiClient.patch(`/auth/users/${encodeURIComponent(id)}`, {
    isApproved,
  });
  return mapAdmin(data?.user || data);
}

export async function getAdminMetrics() {
  const { data } = await apiClient.get("/auth/admin-metrics");
  return {
    totalAdmins: Number(data?.totalAdmins || 0),
    activeAdmins: Number(data?.activeAdmins || 0),
    inactiveAdmins: Number(data?.inactiveAdmins || 0),
    recentLogins: Number(data?.recentLogins || 0),
    recentActions: Number(data?.recentActions || 0),
  };
}

export function getAdminErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Could not reach the server. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
