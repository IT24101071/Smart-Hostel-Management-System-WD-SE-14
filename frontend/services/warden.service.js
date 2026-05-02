import { AxiosError } from "axios";
import apiClient from "../lib/axios";

function mapUser(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.id ?? user._id,
  };
}

export async function getStaffList(params = {}) {
  const requestParams = {
    q: params.q?.trim() || undefined,
    active: params.active ?? undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
  const { data } = await apiClient.get("/warden/staff", { params: requestParams });
  const list = Array.isArray(data?.data) ? data.data : [];
  return {
    users: list.map(mapUser).filter(Boolean),
    meta: data?.meta ?? {},
  };
}

function buildCreateStaffFormData(payload) {
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
  return form;
}

export async function createStaff(payload) {
  const { data } = await apiClient.post(
    "/warden/staff",
    buildCreateStaffFormData(payload),
  );
  return mapUser(data?.user);
}

export async function updateStaff(id, payload) {
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
      `/warden/staff/${encodeURIComponent(id)}`,
      form,
    );
    return mapUser(data?.user);
  }

  const requestBody = {};
  if (payload.name !== undefined) requestBody.name = payload.name?.trim();
  if (payload.email !== undefined) requestBody.email = payload.email?.trim();
  if (payload.password !== undefined && payload.password !== "") {
    requestBody.password = payload.password;
  }
  if (payload.nicNumber !== undefined) {
    requestBody.nicNumber = payload.nicNumber?.trim();
  }
  const { data } = await apiClient.patch(
    `/warden/staff/${encodeURIComponent(id)}`,
    requestBody,
  );
  return mapUser(data?.user);
}

export async function toggleStaffStatus(id, isApproved) {
  const { data } = await apiClient.patch(
    `/warden/staff/${encodeURIComponent(id)}/status`,
    { isApproved: Boolean(isApproved) },
  );
  return mapUser(data?.user);
}

export async function deleteStaff(id) {
  await apiClient.delete(`/warden/staff/${encodeURIComponent(id)}`);
}

export async function getStudentList(params = {}) {
  const requestParams = {
    q: params.q?.trim() || undefined,
    active: params.active ?? undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  };
  const { data } = await apiClient.get("/warden/students", { params: requestParams });
  const list = Array.isArray(data?.data) ? data.data : [];
  return {
    users: list.map(mapUser).filter(Boolean),
    meta: data?.meta ?? {},
  };
}

export async function deleteStudent(id) {
  await apiClient.delete(`/warden/user/${encodeURIComponent(id)}`);
}

export function getWardenStaffErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) {
      return "Could not reach the server. Please check your connection.";
    }
  }
  return "Something went wrong. Please try again.";
}
