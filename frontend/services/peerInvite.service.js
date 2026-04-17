import { AxiosError } from "axios";
import { API_BASE_URL } from "../constants/api";
import { storage } from "../lib/storage";

function apiUrl(path) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function fetchApi(path, options = {}) {
  const { method = "GET", body, timeoutMs = 30000 } = options;
  const token = await storage.getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);
    const text = await res.text();
    const data = text.trim() ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new AxiosError(data?.message || `Request failed (${res.status})`);
      err.response = { status: res.status, data };
      throw err;
    }
    return data;
  } catch (e) {
    clearTimeout(tid);
    if (e instanceof AxiosError) throw e;
    const err = new AxiosError(
      e?.name === "AbortError"
        ? "Request timed out. Please try again."
        : e?.message || "Network Error",
    );
    err.code =
      e?.name === "AbortError" ? AxiosError.ECONNABORTED : AxiosError.ERR_NETWORK;
    throw err;
  }
}

export async function createPeerInvite({ roomId, peers }) {
  return fetchApi("/peer-invites", {
    method: "POST",
    body: { roomId, peers },
  });
}

export async function respondToPreBookingInvite(peerInviteId, action) {
  return fetchApi(`/peer-invites/${encodeURIComponent(peerInviteId)}/respond`, {
    method: "POST",
    body: { action },
  });
}

export async function getMyPeerInvites(roomId) {
  const qs = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
  const data = await fetchApi(`/peer-invites${qs}`, { method: "GET" });
  return data?.data ?? [];
}

export function getPeerInviteErrorMessage(error) {
  if (error instanceof AxiosError) {
    const msg = error.response?.data?.message;
    if (msg) return msg;
    if (!error.response) {
      if (error.code === "ECONNABORTED") return "Request timed out. Please try again.";
      return "Could not connect to server.";
    }
  }
  return "Could not process peer invite request.";
}
