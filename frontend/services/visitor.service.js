import { AxiosError } from "axios";
import { Platform } from "react-native";
import apiClient from "../lib/axios";

function mapVisitor(raw) {
  if (!raw) return null;
  return {
    ...raw,
    id: raw.id ?? raw._id,
  };
}

async function buildCheckInFormData(payload) {
  const form = new FormData();
  form.append("fullName", payload.fullName?.trim() ?? "");
  form.append("nationalIdOrPassport", payload.nationalIdOrPassport?.trim() ?? "");
  form.append("contactNumber", payload.contactNumber?.trim() ?? "");
  form.append("studentName", payload.studentName?.trim() ?? "");
  form.append("studentIdOrRoom", payload.studentIdOrRoom?.trim() ?? "");
  form.append("relationshipToStudent", payload.relationshipToStudent?.trim() ?? "");
  form.append("purposeOfVisit", payload.purposeOfVisit?.trim() ?? "");
  form.append("expectedTimeOut", payload.expectedTimeOut);

  const idImage = payload?.idImage;
  if (!idImage?.uri) return form;

  let name = idImage.name || "visitor-id.jpg";
  const type = idImage.mimeType || idImage.type || "image/jpeg";

  if (Platform.OS === "web" && idImage.uri.startsWith("blob:")) {
    const response = await fetch(idImage.uri);
    const blob = await response.blob();
    const file = new File([blob], name, { type });
    form.append("idImage", file);
    return form;
  }

  if (!name.includes(".")) {
    if (type === "image/png") name = `${name}.png`;
    else if (type === "image/webp") name = `${name}.webp`;
    else name = `${name}.jpg`;
  }

  form.append("idImage", {
    uri: idImage.uri,
    name,
    type,
  });

  return form;
}

function buildCheckInJsonPayload(payload) {
  return {
    fullName: payload.fullName?.trim() ?? "",
    nationalIdOrPassport: payload.nationalIdOrPassport?.trim() ?? "",
    contactNumber: payload.contactNumber?.trim() ?? "",
    studentName: payload.studentName?.trim() ?? "",
    studentIdOrRoom: payload.studentIdOrRoom?.trim() ?? "",
    relationshipToStudent: payload.relationshipToStudent?.trim() ?? "",
    purposeOfVisit: payload.purposeOfVisit?.trim() ?? "",
    expectedTimeOut: payload.expectedTimeOut,
  };
}

export async function checkInVisitor(payload) {
  const hasImage = Boolean(payload?.idImage?.uri);
  const requestBody = hasImage
    ? await buildCheckInFormData(payload)
    : buildCheckInJsonPayload(payload);
  const { data } = await apiClient.post("/visitors/check-in", requestBody, {
    timeout: 120000,
  });
  return mapVisitor(data?.data);
}

export async function checkOutVisitor(id) {
  const { data } = await apiClient.patch(`/visitors/${encodeURIComponent(id)}/check-out`);
  return mapVisitor(data?.data);
}

export async function updateVisitor(id, payload) {
  const requestBody = {
    fullName: payload.fullName?.trim() ?? "",
    nationalIdOrPassport: payload.nationalIdOrPassport?.trim() ?? "",
    contactNumber: payload.contactNumber?.trim() ?? "",
    relationshipToStudent: payload.relationshipToStudent?.trim() ?? "",
    purposeOfVisit: payload.purposeOfVisit?.trim() ?? "",
    expectedTimeOut: payload.expectedTimeOut,
  };
  const { data } = await apiClient.patch(`/visitors/${encodeURIComponent(id)}`, requestBody);
  return mapVisitor(data?.data);
}

export async function getVisitors(filters = {}) {
  const params = {
    search: filters.search?.trim() || undefined,
    status: filters.status || undefined,
    student: filters.student?.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: filters.page || 1,
    limit: filters.limit || 20,
  };
  const { data } = await apiClient.get("/visitors", { params });
  const list = Array.isArray(data?.data) ? data.data : [];
  return {
    data: list.map(mapVisitor).filter(Boolean),
    meta: data?.meta ?? {},
  };
}

export async function getRoomStudents(roomNumber) {
  const normalizedRoom = String(roomNumber ?? "").trim();
  const { data } = await apiClient.get("/visitors/room-students", {
    params: { roomNumber: normalizedRoom || undefined },
  });
  const list = Array.isArray(data?.data) ? data.data : [];
  return list
    .map((item) => ({
      id: item?.id ?? item?._id,
      name: item?.name ?? "",
      studentId: item?.studentId ?? "",
      roomNumber: item?.roomNumber ?? normalizedRoom,
    }))
    .filter((item) => Boolean(item.id));
}

export async function getActiveVisitorRooms() {
  const { data } = await apiClient.get("/visitors/active-rooms");
  const list = Array.isArray(data?.data) ? data.data : [];
  return list
    .map((item) => ({
      roomNumber: String(item?.roomNumber ?? "").trim(),
    }))
    .filter((item) => Boolean(item.roomNumber));
}

export function getVisitorErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Could not reach the server. Please check your network.";
  }
  return "Failed to process visitor request.";
}
