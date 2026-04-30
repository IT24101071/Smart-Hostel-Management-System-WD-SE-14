import { AxiosError } from "axios";
import apiClient from "../lib/axios";

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

export async function createAdmin(payload) {
  const { data } = await apiClient.post("/auth/create-admin", payload);
  return mapAdmin(data?.data ?? data?.admin ?? data?.user ?? data);
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
