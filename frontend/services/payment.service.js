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
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(tid);
    const msg = e?.message || "Network Error";
    const err = new AxiosError(msg);
    err.code = e?.name === "AbortError" ? AxiosError.ECONNABORTED : undefined;
    throw err;
  }

  clearTimeout(tid);
  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = new AxiosError(data?.message || "Request failed");
    error.response = { status: res.status, data };
    throw error;
  }

  return data;
}

// Get all bookings with payment details (admin)
export async function getAllPayments() {
  return fetchApi("/payments/bookings");
}

// Get pending payments (submitted status)
export async function getPendingPayments() {
  return fetchApi("/payments/pending");
}

// Get payment statistics
export async function getPaymentStats() {
  return fetchApi("/payments/stats");
}

// Get bookings by payment status
export async function getPaymentsByStatus(status) {
  return fetchApi(`/payments/status/${status}`);
}

// Confirm payment
export async function confirmPayment(paymentId, data) {
  return fetchApi(`/payments/${paymentId}/confirm`, {
    method: "PUT",
    body: data,
  });
}

// Reject payment
export async function rejectPayment(paymentId, reason) {
  return fetchApi(`/payments/${paymentId}/reject`, {
    method: "PUT",
    body: { reason },
  });
}
