import { AxiosError } from "axios";
import apiClient from "../lib/axios";

export async function getAllPayments() {
  const { data } = await apiClient.get("/payments/bookings");
  return data ?? {};
}

export async function getPendingPayments() {
  const { data } = await apiClient.get("/payments/pending");
  return data ?? {};
}

export async function getPaymentStats() {
  const { data } = await apiClient.get("/payments/stats");
  return data ?? {};
}

export async function getPaymentsByStatus(status) {
  const normalized = String(status ?? "").trim();
  const { data } = await apiClient.get(
    `/payments/status/${encodeURIComponent(normalized)}`,
  );
  return data ?? {};
}

export async function confirmPayment(id, payload = {}) {
  const { data } = await apiClient.put(
    `/payments/${encodeURIComponent(String(id))}/confirm`,
    payload,
  );
  return data;
}

export async function rejectPayment(id, reason) {
  const { data } = await apiClient.put(
    `/payments/${encodeURIComponent(String(id))}/reject`,
    { reason: reason ?? "Payment rejected by admin" },
  );
  return data;
}

export function getPaymentErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Could not reach payment services.";
  }
  return "Payment request failed.";
}
