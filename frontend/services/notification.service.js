import { AxiosError } from "axios";
import apiClient from "../lib/axios";

function mapNotification(item) {
  return {
    ...item,
    id: item?.id ?? item?._id,
    read: Boolean(item?.read),
  };
}

export async function getMyNotifications() {
  const { data } = await apiClient.get("/notifications/me");
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list.map(mapNotification).filter((item) => Boolean(item.id));
}

export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(
    `/notifications/${encodeURIComponent(String(id))}/read`,
  );
  return data;
}

export function getNotificationErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Unable to load notifications.";
  }
  return "Notification request failed.";
}
