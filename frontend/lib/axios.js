import axios from "axios";
import { router } from "expo-router";
import { API_BASE_URL, API_TIMEOUT_MS } from "../constants/api";
import { storage } from "./storage";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;
    if (isFormData && config.headers?.delete) {
      config.headers.delete("Content-Type");
    } else if (isFormData) {
      delete config.headers["Content-Type"];
    }
    if (isFormData) {
      const minMs = 120000;
      config.timeout = Math.max(config.timeout ?? 0, minMs);
      console.log(
        "[API] FormData detected - letting axios set multipart boundary",
      );
    }

    if (!config.headers.Authorization) {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      config.data instanceof FormData ? "(FormData)" : "",
    );
    return config;
  },
  (error) => {
    console.error("[API] Request setup error:", error.message);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ← ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error(
      `[API] Error ← ${error.config?.url}`,
      `| status: ${error.response?.status ?? "no response"}`,
      `| code: ${error.code}`,
      `| message: ${error.message}`,
      error.response?.data ?? "",
    );
    if (error.response?.status === 401) {
      await storage.clear();
      router.replace("/");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
