import { AxiosError } from 'axios';
import apiClient from '../lib/axios';

// ── Types ────────────────────────────────────────────────────────

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'warden' | 'admin';
  };
};

// ── API calls ────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Returns the JWT token and basic user info on success.
 * Throws an AxiosError on 400 (bad credentials) or 403 (not approved).
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

// ── Error helpers ────────────────────────────────────────────────

/**
 * Extracts a human-readable message from any thrown error so the UI
 * never has to inspect raw Axios internals.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Server sent a { message: "..." } body
    const serverMessage = error.response?.data?.message as string | undefined;
    if (serverMessage) return serverMessage;

    // Request left but no response arrived
    if (!error.response) return 'Unable to connect. Please check your network.';

    // Timeout
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  }
  console.error('[auth.service] Unhandled error type:', error);
  return 'Something went wrong. Please try again.';
}
