import axios from 'axios';
import type { ApiErrorResponse, ApiResponse } from '@/types/api';
import { notifyUnauthorized } from '@/services/api/authEvents';
import { ApiRequestError } from '@/services/api/errors';
import { getStoredToken } from '@/services/api/tokenStorage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data as ApiErrorResponse | undefined;
    const statusCode = payload?.error?.statusCode ?? error.response?.status ?? 500;
    const path = payload?.error?.path;
    const message = payload?.error?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join(', ')
      : message ?? 'No fue posible completar la solicitud';

    const apiError = new ApiRequestError(normalizedMessage, statusCode, path);

    if (statusCode === 401) {
      notifyUnauthorized();
    }

    return Promise.reject(apiError);
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  const response = await promise;
  return response.data.data;
}
