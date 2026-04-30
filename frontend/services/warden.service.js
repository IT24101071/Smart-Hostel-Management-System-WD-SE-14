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

export async function createStaff(payload) {
  const { data } = await apiClient.post("/warden/staff", {
    name: payload.name?.trim(),
    email: payload.email?.trim(),
    password: payload.password ?? "",
  });
  return mapUser(data?.user);
}

export async function updateStaff(id, payload) {
  const requestBody = {};
  if (payload.name !== undefined) requestBody.name = payload.name?.trim();
  if (payload.email !== undefined) requestBody.email = payload.email?.trim();
  if (payload.password !== undefined) requestBody.password = payload.password;
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
