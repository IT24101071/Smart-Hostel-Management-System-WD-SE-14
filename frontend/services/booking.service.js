import { AxiosError } from "axios";
import { API_BASE_URL } from "../constants/api";
import { storage } from "../lib/storage";

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

export async function createBooking(payload) {
  return fetchApi("/bookings", {
    method: "POST",
    body: payload,
  });
}

export async function uploadReceipt(fileUri) {
  if (!fileUri) return null;

  const formData = new FormData();
  
  // For Expo/React Native, we need to construct the file object
  const filename = fileUri.split("/").pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1] === 'pdf' ? 'pdf' : match[1]}` : `image`;

  formData.append("receipt", {
    uri: fileUri,
    name: filename,
    type: type,
  });

  return fetchApi("/upload/receipt", {
    method: "POST",
    body: formData,
  });
}

function mapBooking(raw) {
  if (!raw) return null;
  const room = raw.room
    ? {
        ...raw.room,
        id: raw.room._id ?? raw.room.id,
      }
    : null;
  return {
    ...raw,
    id: raw.id ?? raw._id,
    room,
  };
}

export async function getMyLatestBooking() {
  const data = await fetchApi("/bookings/me/latest", { method: "GET" });
  return mapBooking(data.booking);
}

export async function getMyBookings() {
  const data = await fetchApi("/bookings/me", { method: "GET" });
  const list = Array.isArray(data?.data) ? data.data : [];
  return list.map(mapBooking).filter(Boolean);
}

export async function getBookingReceipt(bookingId) {
  if (!bookingId) {
    throw new Error("Booking ID is required");
  }
  return fetchApi(`/bookings/${bookingId}/receipt`, { method: "GET" });
}

export async function cancelBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Booking ID is required");
  }
  return fetchApi(`/bookings/${bookingId}/cancel`, { method: "POST" });
}

export async function extendBooking(bookingId, payload) {
  if (!bookingId) {
    throw new Error("Booking ID is required");
  }
  return fetchApi(`/bookings/${bookingId}/extend`, {
    method: "POST",
    body: payload,
  });
}

export function getBookingErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) {
      if (error.code === "ECONNABORTED")
        return "Request timed out. Please try again.";
      if (error.code === "ERR_NETWORK" || error.message === "Network Error")
        return "Could not reach the server. Check Wi-Fi and that the API is running.";
      return "Unable to connect. Please check your network.";
    }
  }
  return "Could not save booking. Please try again.";
}
