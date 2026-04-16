import { AxiosError } from "axios";
import { Platform } from "react-native";
import { API_BASE_URL } from "../constants/api";
import { storage } from "../lib/storage";

function mapRoom(r) {
  const { _id, ...rest } = r;
  return { ...rest, id: _id };
}

function apiUrl(path) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function fetchApi(path, options = {}) {
  const {
    method = "GET",
    body,
    timeoutMs = body instanceof FormData ? 120000 : 30000,
  } = options;

  const token = await storage.getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(tid);
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

  clearTimeout(tid);

  const text = await res.text();
  let data = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const err = new AxiosError(
      data?.message || `Request failed (${res.status})`,
    );
    err.response = { status: res.status, data };
    throw err;
  }

  return data;
}

export async function getRooms(params = { limit: 100 }) {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.page != null) q.set("page", String(params.page));
  if (params.roomType) q.set("roomType", params.roomType);
  if (params.availabilityStatus)
    q.set("availabilityStatus", params.availabilityStatus);
  const qs = q.toString();
  const path = qs ? `/rooms?${qs}` : "/rooms";

  const data = await fetchApi(path, { method: "GET" });

  return {
    rooms: data.data.map(mapRoom),
    pagination: data.pagination,
  };
}

export async function getRoomById(id) {
  const data = await fetchApi(`/rooms/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return mapRoom(data);
}

export async function createRoom(values) {
  if (values.imageUris?.length) {
    const form = await buildFormData(
      {
        roomNumber: values.roomNumber.trim(),
        roomType: values.roomType,
        pricePerMonth: String(Number(values.pricePerMonth)),
        capacity: String(values.capacity),
        description: values.description.trim(),
      },
      values.imageUris,
    );
    const data = await fetchApi("/rooms", { method: "POST", body: form });
    return mapRoom(data);
  }

  const data = await fetchApi("/rooms", {
    method: "POST",
    body: {
      roomNumber: values.roomNumber.trim(),
      roomType: values.roomType,
      pricePerMonth: Number(values.pricePerMonth),
      capacity: values.capacity,
      description: values.description.trim(),
    },
  });
  return mapRoom(data);
}

export async function updateRoom(id, values) {
  const imageUris = values.imageUris ?? [];
  const keptImageUrls = imageUris.filter(
    (item) =>
      typeof item === "string" &&
      (item.startsWith("http://") || item.startsWith("https://")),
  );

  const form = await buildFormData(
    {
      roomType: values.roomType,
      pricePerMonth: String(Number(values.pricePerMonth)),
      capacity: String(values.capacity),
      description: values.description.trim(),
      availabilityStatus: values.availabilityStatus,
      keptImageUrls: JSON.stringify(keptImageUrls),
    },
    imageUris,
  );
  const data = await fetchApi(`/rooms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: form,
  });
  return mapRoom(data);
}

export async function deleteRoom(id) {
  await fetchApi(`/rooms/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function buildFormData(fields, imageUris) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") form.append(key, value);
  }

  if (imageUris && imageUris.length > 0) {
    for (let index = 0; index < imageUris.length; index++) {
      const item = imageUris[index];
      const uri = typeof item === "string" ? item : item.uri;

      if (
        typeof uri === "string" &&
        (uri.startsWith("http://") || uri.startsWith("https://"))
      ) {
        continue;
      }

      let filename, mimeType;

      if (Platform.OS === "web" && item.mimeType) {
        filename = item.fileName || item.filename || "photo.jpg";
        mimeType = item.mimeType || "image/jpeg";
      } else {
        filename = uri.split("/").pop() ?? "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
        mimeType =
          ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      }

      if (Platform.OS === "web" && uri.startsWith("blob:")) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], filename, { type: mimeType });
          form.append("images", file);
        } catch (error) {
          console.error(`[buildFormData] blob to File:`, error);
        }
      } else {
        form.append("images", {
          uri,
          name: filename,
          type: mimeType,
        });
      }
    }
  }

  return form;
}

export function getRoomErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) {
      if (error.code === "ECONNABORTED")
        return "Request timed out. Please try again.";
      if (error.code === "ERR_NETWORK" || error.message === "Network Error")
        return "Could not reach the server. Check Wi‑Fi and that the API is running.";
      return "Unable to connect. Please check your network.";
    }
    if (error.code === "ECONNABORTED")
      return "Request timed out. Please try again.";
  }
  console.error("[room.service] Unhandled error:", error);
  return "Something went wrong. Please try again.";
}
