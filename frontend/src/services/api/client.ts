import axios from 'axios';
import type { ApiErrorResponse, ApiResponse } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data as ApiErrorResponse | undefined;
    const message = payload?.error?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join(', ')
      : message ?? 'No fue posible completar la solicitud';

    return Promise.reject(new Error(normalizedMessage));
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  const response = await promise;
  return response.data.data;
}
