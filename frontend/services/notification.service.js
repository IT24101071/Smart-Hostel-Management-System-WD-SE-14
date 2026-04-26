import { AxiosError } from "axios";
import apiClient from "../lib/axios";

function mapNotification(raw) {
  return {
    ...raw,
    id: raw._id ?? raw.id,
    actor: raw.actor
      ? {
          ...raw.actor,
          id: raw.actor._id ?? raw.actor.id,
        }
      : null,
    booking: raw.booking?._id ?? raw.booking ?? null,
    ticket: raw.ticket?._id ?? raw.ticket ?? null,
    meta: raw.meta ?? {},
  };
}

export async function getMyNotifications() {
  const { data } = await apiClient.get("/notifications");
  return (data.data ?? []).map(mapNotification);
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  );
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.patch("/notifications/read-all");
  return data;
}

export function getNotificationErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) {
      if (error.code === "ECONNABORTED")
        return "Request timed out. Please try again.";
      if (error.code === "ERR_NETWORK" || error.message === "Network Error")
        return "Could not reach the server. Check Wi-Fi and that the API is running.";
    }
  }
  return "Could not load notifications.";
}
