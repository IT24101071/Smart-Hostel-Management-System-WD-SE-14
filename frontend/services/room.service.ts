import { AxiosError } from "axios";
import apiClient from "../lib/axios";
import { Room, RoomFormValues } from "../types/room";

type ApiRoom = Omit<Room, "id"> & { _id: string };

function mapRoom(r: ApiRoom): Room {
  const { _id, ...rest } = r;
  return { ...rest, id: _id };
}

export type GetRoomsParams = {
  roomType?: string;
  availabilityStatus?: string;
  page?: number;
  limit?: number;
};

export type GetRoomsResponse = {
  rooms: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getRooms(
  params: GetRoomsParams = { limit: 100 },
): Promise<GetRoomsResponse> {
  const { data } = await apiClient.get<{
    data: ApiRoom[];
    pagination: GetRoomsResponse["pagination"];
  }>("/rooms", { params });

  return {
    rooms: data.data.map(mapRoom),
    pagination: data.pagination,
  };
}

export async function getRoomById(id: string): Promise<Room> {
  const { data } = await apiClient.get<ApiRoom>(`/rooms/${id}`);
  return mapRoom(data);
}

export async function createRoom(values: RoomFormValues): Promise<Room> {
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
    const { data } = await apiClient.post<ApiRoom>("/rooms", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRoom(data);
  }

  const { data } = await apiClient.post<ApiRoom>("/rooms", {
    roomNumber: values.roomNumber.trim(),
    roomType: values.roomType,
    pricePerMonth: Number(values.pricePerMonth),
    capacity: values.capacity,
    description: values.description.trim(),
  });
  return mapRoom(data);
}

export async function updateRoom(
  id: string,
  values: RoomFormValues,
): Promise<Room> {
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
    const { data } = await apiClient.put<ApiRoom>(`/rooms/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRoom(data);
  }

  const { data } = await apiClient.put<ApiRoom>(`/rooms/${id}`, {
    roomType: values.roomType,
    pricePerMonth: Number(values.pricePerMonth),
    capacity: values.capacity,
    description: values.description.trim(),
    availabilityStatus: values.availabilityStatus,
  });
  return mapRoom(data);
}

export async function deleteRoom(id: string): Promise<void> {
  await apiClient.delete(`/rooms/${id}`);
}

function buildFormData(
  fields: Record<string, string>,
  imageUris: string[],
): FormData {
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
    } as unknown as Blob);
  });

  return form;
}

export function getRoomErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const serverMessage = error.response?.data?.message as string | undefined;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Unable to connect. Please check your network.";
    if (error.code === "ECONNABORTED")
      return "Request timed out. Please try again.";
  }
  console.error("[room.service] Unhandled error:", error);
  return "Something went wrong. Please try again.";
}
