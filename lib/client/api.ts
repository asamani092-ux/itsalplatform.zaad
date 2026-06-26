import type { ApiSuccess, ApiError } from "@/types/domain";

export type { ApiSuccess, ApiError };

export async function parseApiResponse<T>(
  response: Response,
): Promise<ApiSuccess<T> | ApiError> {
  return response.json() as Promise<ApiSuccess<T> | ApiError>;
}

export function getApiErrorMessage(
  payload: ApiSuccess<unknown> | ApiError,
  fallback = "حدث خطأ",
): string {
  if (!payload.success) {
    return payload.error.message;
  }
  return fallback;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiSuccess<T>> {
  const response = await fetch(path, init);
  const payload = await parseApiResponse<T>(response);
  if (!response.ok || !payload.success) {
    throw new Error(getApiErrorMessage(payload, "فشل الطلب"));
  }
  return payload;
}

export const api = {
  public: {
    departments: () =>
      apiFetch<{ departments: unknown[] }>("/api/public/departments"),
    requestTypes: (departmentId?: string) => {
      const qs = departmentId ? `?departmentId=${departmentId}` : "";
      return apiFetch<{ requestTypes: unknown[] }>(
        `/api/public/request-types${qs}`,
      );
    },
    submitRequest: (body: unknown) =>
      apiFetch<unknown>("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  },
  auth: {
    login: (body: { phoneNumber: string; password: string }) =>
      apiFetch<{ user: unknown }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    logout: () =>
      apiFetch<unknown>("/api/auth/logout", { method: "POST" }),
    me: () => apiFetch<{ user: unknown }>("/api/auth/me"),
  },
  employee: {
    tickets: () => apiFetch<{ tickets: unknown[] }>("/api/employee/tickets"),
    ticket: (id: string) =>
      apiFetch<{ ticket: unknown }>(`/api/employee/tickets/${id}`),
    complete: (id: string, formData: FormData) =>
      apiFetch<unknown>(`/api/employee/tickets/${id}/complete`, {
        method: "POST",
        body: formData,
      }),
  },
  manager: {
    kpis: () => apiFetch<{ kpis: unknown }>("/api/manager/kpis"),
    team: () => apiFetch<{ employees: unknown[] }>("/api/manager/team"),
    tickets: (params?: Record<string, string>) => {
      const qs = params
        ? `?${new URLSearchParams(params).toString()}`
        : "";
      return apiFetch<{ requests: unknown[] }>(
        `/api/manager/tickets${qs}`,
      );
    },
  },
};
