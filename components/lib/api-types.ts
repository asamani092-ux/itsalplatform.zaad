type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: { message: string; code: string } };

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export async function parseApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  return (await response.json()) as ApiResult<T>;
}

export function getApiErrorMessage(
  payload: ApiResult<unknown>,
  fallback: string,
): string {
  if (!payload.success) return payload.error.message;
  return fallback;
}
