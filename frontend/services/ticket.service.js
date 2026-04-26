import { AxiosError } from "axios";
import { Platform } from "react-native";
import apiClient from "../lib/axios";

function mapTicket(raw) {
  if (!raw) return null;
  return {
    ...raw,
    id: raw.id ?? raw._id,
  };
}

async function buildTicketFormData(payload) {
  const form = new FormData();
  form.append("category", payload.category);
  form.append("subject", payload.subject.trim());
  form.append("description", payload.description.trim());
  form.append("urgency", payload.urgency);

  const imageList = Array.isArray(payload.images)
    ? payload.images
    : payload.image
      ? [payload.image]
      : [];
  if (!imageList.length) return form;

  for (const image of imageList) {
    if (!image?.uri) continue;
    let name = image.name || "ticket-image.jpg";
    let type = image.mimeType || "image/jpeg";

    if (Platform.OS === "web" && image.uri.startsWith("blob:")) {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const file = new File([blob], name, { type });
      form.append("images", file);
      continue;
    }

    if (!name.includes(".")) {
      if (type === "image/png") name = `${name}.png`;
      else if (type === "image/webp") name = `${name}.webp`;
      else name = `${name}.jpg`;
    }

    form.append("images", {
      uri: image.uri,
      name,
      type,
    });
  }
  return form;
}

export async function createTicket(payload) {
  const form = await buildTicketFormData(payload);
  const { data } = await apiClient.post("/tickets", form);
  return mapTicket(data.ticket);
}

export async function getMyTickets() {
  const { data } = await apiClient.get("/tickets/me");
  const list = Array.isArray(data?.data) ? data.data : [];
  return list.map(mapTicket).filter(Boolean);
}

export async function getAllTickets(filters = {}) {
  const params = {
    status: filters.status || undefined,
    category: filters.category || undefined,
    urgency: filters.urgency || undefined,
    search: filters.search?.trim() || undefined,
  };
  const { data } = await apiClient.get("/tickets", { params });
  const list = Array.isArray(data?.data) ? data.data : [];
  return {
    tickets: list.map(mapTicket).filter(Boolean),
    meta: data?.meta || {},
  };
}

export async function getTicketById(id) {
  const { data } = await apiClient.get(`/tickets/${encodeURIComponent(id)}`);
  return mapTicket(data?.ticket);
}

export async function updateTicketStatus(id, payload) {
  const { data } = await apiClient.patch(
    `/tickets/${encodeURIComponent(id)}/status`,
    {
      status: payload.status,
      note: payload.note?.trim() || "",
    },
  );
  return mapTicket(data?.ticket);
}

export async function assignTicket(id, payload) {
  const { data } = await apiClient.patch(`/tickets/${encodeURIComponent(id)}/assign`, {
    assignedTo: payload.assignedTo,
    note: payload.note?.trim() || "",
  });
  return mapTicket(data?.ticket);
}

export async function addTicketNote(id, payload) {
  const { data } = await apiClient.post(`/tickets/${encodeURIComponent(id)}/notes`, {
    note: payload.note?.trim() || "",
  });
  return mapTicket(data?.ticket);
}

export async function getTicketImageUrls(id) {
  const { data } = await apiClient.get(`/tickets/${encodeURIComponent(id)}/image-urls`);
  return Array.isArray(data?.images) ? data.images : [];
}

export function getTicketErrorMessage(error) {
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
  return "Could not process ticket request.";
}
