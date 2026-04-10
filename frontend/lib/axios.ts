import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
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
  async (config: InternalAxiosRequestConfig) => {
    if (!config.headers.Authorization) {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error: AxiosError) => {
    console.error("[API] Request setup error:", error.message);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ← ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
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
