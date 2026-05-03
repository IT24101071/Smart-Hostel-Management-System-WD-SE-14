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
  const form = new FormData();
  form.append("name", payload.name?.trim() ?? "");
  form.append("email", payload.email?.trim() ?? "");
  form.append("password", payload.password ?? "");
  form.append("nicNumber", payload.nicNumber?.trim() ?? "");
  if (payload.nicPhoto?.uri) {
    form.append("nicPhoto", {
      uri: payload.nicPhoto.uri,
      type: payload.nicPhoto.type || "image/jpeg",
      name: payload.nicPhoto.name || "nic.jpg",
    });
  }
  const { data } = await apiClient.post("/auth/create-warden", form);
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
    form.append("nicPhoto", {
      uri: payload.nicPhoto.uri,
      type: payload.nicPhoto.type || "image/jpeg",
      name: payload.nicPhoto.name || "nic.jpg",
    });
    const { data } = await apiClient.patch(
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
