import type { AuthResponse, GoogleAuthData, Order, Service, TelegramAuthData, User } from "@/types/api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") message = body.detail;
    } catch { /* retain the safe default */ }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export const api = {
  telegramLogin: (data: TelegramAuthData) => request<AuthResponse>("/auth/telegram", { method: "POST", body: JSON.stringify(data) }),
  googleLogin: (data: GoogleAuthData) => request<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify(data) }),
  me: (token: string) => request<User>("/users/me", {}, token),
  publicServices: async (): Promise<Service[]> => {
    const res = await request<unknown>("/services");
    return Array.isArray(res) ? (res as Service[]) : [];
  },
  services: async (token: string): Promise<Service[]> => {
    const res = await request<unknown>("/services", {}, token);
    return Array.isArray(res) ? (res as Service[]) : [];
  },
  orders: async (token: string): Promise<Order[]> => {
    const res = await request<unknown>("/orders", {}, token);
    if (Array.isArray(res)) {
      return res as Order[];
    }
    if (res && typeof res === "object" && "items" in res && Array.isArray((res as { items: unknown }).items)) {
      return (res as { items: Order[] }).items;
    }
    return [];
  },
  createOrder: (token: string, order: { service_id: string | number; link: string; quantity: number }, idempotencyKey: string) =>
    request<Order>("/orders", { method: "POST", body: JSON.stringify(order), headers: { "Idempotency-Key": idempotencyKey } }, token),
};
