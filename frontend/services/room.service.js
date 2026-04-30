import { AxiosError } from "axios";
import { Platform } from "react-native";
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
    const { data } = await apiClient.post("/rooms", form);
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

export async function updateRoom(id, values) {
  console.log("[room.service] updateRoom - imageUris:", values.imageUris);

  if (values.imageUris?.length) {
    console.log(
      "[room.service] Building FormData with",
      values.imageUris.length,
      "images",
    );
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
    const { data } = await apiClient.put(`/rooms/${id}`, form);
    return mapRoom(data);
  }

  console.log(
    "[room.service] No images to upload, sending data without FormData",
  );
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

  // Only add images if there are any
  if (imageUris && imageUris.length > 0) {
    console.log("[buildFormData] Processing", imageUris.length, "images");
    imageUris.forEach((item, index) => {
      // Handle both asset objects (web) and string URIs (native)
      const uri = typeof item === "string" ? item : item.uri;

      // Skip if URI is a string starting with 'http' (already uploaded image from API)
      if (
        typeof uri === "string" &&
        (uri.startsWith("http://") || uri.startsWith("https://"))
      ) {
        console.log("[buildFormData] Skipping URL:", uri);
        return;
      }

      let filename, mimeType;

      // On web, we have the full asset object with type info
      if (Platform.OS === "web" && item.mimeType) {
        filename = item.fileName || item.filename || "photo.jpg";
        mimeType = item.mimeType || "image/jpeg"; // Use mimeType property, not type
      } else {
        // On native, extract from URI
        filename = uri.split("/").pop() ?? "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
        mimeType =
          ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      }

      console.log(
        `[buildFormData] Adding image ${index + 1}:`,
        filename,
        mimeType,
      );

      // IMPORTANT: On Android, use URI directly instead of blob
      // to avoid "Network request failed" errors. See:
      // https://github.com/expo/expo/issues/8323
      form.append("images", {
        uri,
        name: filename,
        type: mimeType,
      });
    });
  } else {
    console.log("[buildFormData] No images to add");
  }

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
