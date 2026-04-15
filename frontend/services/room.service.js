import { AxiosError } from "axios";
import apiClient from "../lib/axios";
function mapRoom(r) {
  const { _id, ...rest } = r;
  return { ...rest, id: _id };
}

export async function getRooms(params = { limit: 100 }) {
  const { data } = await apiClient.get("/rooms", { params });

  return {
    rooms: data.data.map(mapRoom),
    pagination: data.pagination,
  };
}

export async function getRoomById(id) {
  const { data } = await apiClient.get(`/rooms/${id}`);
  return mapRoom(data);
}

export async function createRoom(values) {
  if (values.imageUris?.length) {
    const form = buildFormData(
      {
        roomNumber: values.roomNumber.trim(),
        roomType: values.roomType,
        pricePerMonth: String(Number(values.pricePerMonth)),
        capacity: String(values.capacity),
        description: values.description.trim(),
      },
      values.imageUris,
    );
    const { data } = await apiClient.post("/rooms", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRoom(data);
  }

  const { data } = await apiClient.post("/rooms", {
    roomNumber: values.roomNumber.trim(),
    roomType: values.roomType,
    pricePerMonth: Number(values.pricePerMonth),
    capacity: values.capacity,
    description: values.description.trim(),
  });
  return mapRoom(data);
}

export async function updateRoom(
  id,
  values,
) {
  if (values.imageUris?.length) {
    const form = buildFormData(
      {
        roomType: values.roomType,
        pricePerMonth: String(Number(values.pricePerMonth)),
        capacity: String(values.capacity),
        description: values.description.trim(),
        availabilityStatus: values.availabilityStatus,
        imageAction: "append",
      },
      values.imageUris,
    );
    const { data } = await apiClient.put(`/rooms/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRoom(data);
  }

  const { data } = await apiClient.put(`/rooms/${id}`, {
    roomType: values.roomType,
    pricePerMonth: Number(values.pricePerMonth),
    capacity: values.capacity,
    description: values.description.trim(),
    availabilityStatus: values.availabilityStatus,
  });
  return mapRoom(data);
}

export async function deleteRoom(id) {
  await apiClient.delete(`/rooms/${id}`);
}

function buildFormData(fields, imageUris) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") form.append(key, value);
  }

  imageUris.forEach((uri) => {
    const filename = uri.split("/").pop() ?? "photo.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    form.append("images", {
      uri,
      name: filename,
      type: mimeType,
    });
  });

  return form;
}

export function getRoomErrorMessage(error) {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Unable to connect. Please check your network.";
    if (error.code === "ECONNABORTED")
      return "Request timed out. Please try again.";
  }
  console.error("[room.service] Unhandled error:", error);
  return "Something went wrong. Please try again.";
}
