export interface RouteResponse<TData> {
  success: boolean;
  data: TData | null;
  error: string[];
  pagination?: unknown;
}

export class ApiRequestError extends Error {
  status?: number;
  errors: string[];

  constructor(message: string, options?: { status?: number; errors?: string[] }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.errors = options?.errors || [];
  }
}

export function isRouteResponse<TData = unknown>(
  value: unknown,
): value is RouteResponse<TData> {
  if (!value || typeof value !== "object") return false;
  return (
    "success" in value &&
    "data" in value &&
    "error" in value
  );
}

export function unwrapRouteResponse<TData>(value: unknown): TData {
  if (!isRouteResponse<TData>(value)) {
    throw new ApiRequestError("Invalid API response");
  }
  if (!value.success || value.data == null) {
    const message = value.error[0] || "API request failed";
    throw new ApiRequestError(message, { errors: value.error });
  }
  return value.data;
}

export async function readRouteResponse<TData>(
  response: Response,
): Promise<TData> {
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const errors = isRouteResponse(json) ? json.error : [];
    throw new ApiRequestError(errors[0] || `HTTP ${response.status}`, {
      status: response.status,
      errors,
    });
  }
  return unwrapRouteResponse<TData>(json);
}
