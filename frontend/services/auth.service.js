import { AxiosError } from "axios";
import { Platform } from "react-native";
import { API_BASE_URL } from "../constants/api";
import apiClient from "../lib/axios";

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function resolveImageMime(rawType, filename, blobType) {
  const candidates = [rawType, blobType]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());
  for (const c of candidates) {
    if (c === "image/jpg") return "image/jpeg";
    if (c === "image/jpeg" || c === "image/png" || c === "image/webp") return c;
  }
  const base = (filename || "").split(/[/\\]/).pop() ?? "";
  const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  return "image/jpeg";
}

async function appendRegisterImage(
  formData,
  fieldName,
  image,
  defaultFilename,
) {
  if (!image) return;

  if (Platform.OS === "web") {
    if (typeof File !== "undefined" && image instanceof File) {
      formData.append(fieldName, image);
      return;
    }
    const uri = image.uri;
    if (typeof uri !== "string") {
      throw new Error("Invalid image: missing uri on web");
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = image.name || defaultFilename;
    const mime = resolveImageMime(image.type, filename, blob.type);
    formData.append(fieldName, new File([blob], filename, { type: mime }));
    return;
  }

  const filename = image.name || defaultFilename;
  const mime = resolveImageMime(image.type, filename, undefined);

  formData.append(fieldName, {
    uri: image.uri,
    type: mime,
    name: filename,
  });
}

export async function register(payload) {
  const formData = new FormData();

  // Add text fields
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("studentId", payload.studentId);
  formData.append("year", payload.year);
  formData.append("semester", payload.semester);
  formData.append("contactNo", payload.contactNo);
  formData.append("guardianName", payload.guardianName);
  formData.append("guardianContact", payload.guardianContact);
  formData.append("gender", payload.gender);

  await appendRegisterImage(
    formData,
    "profileImage",
    payload.profileImage,
    "profile.jpg",
  );
  await appendRegisterImage(
    formData,
    "idCardImage",
    payload.idCardImage,
    "idcard.jpg",
  );

  const base = API_BASE_URL.replace(/\/$/, "");
  const url = `${base}/auth/register`;

  const controller = new AbortController();
  const timeoutMs = 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const msg =
      e?.name === "AbortError"
        ? "Request timed out. Please try again."
        : e?.message || "Network Error";
    const err = new AxiosError(msg);
    err.code =
      e?.name === "AbortError"
        ? AxiosError.ECONNABORTED
        : AxiosError.ERR_NETWORK;
    throw err;
  }

  clearTimeout(timeoutId);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Invalid response from server" };
  }

  if (!res.ok) {
    const err = new AxiosError(
      data?.message || `Registration failed (${res.status})`,
    );
    err.response = { status: res.status, data };
    throw err;
  }

  return data;
}

export async function login(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export function getAuthErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;

    if (!error.response) {
      if (error.code === "ECONNABORTED")
        return "Request timed out. Please try again.";
      if (error.code === "ERR_NETWORK" || error.message === "Network Error")
        return "Could not reach the server. Use the same Wi‑Fi as your PC, check the API is running, and try again.";
      return "Unable to connect. Please check your network.";
    }

    if (error.code === "ECONNABORTED")
      return "Request timed out. Please try again.";
  }
  if (error?.response?.data?.message) return error.response.data.message;
  console.error("[auth.service] Unhandled error type:", error);
  return "Something went wrong. Please try again.";
}
