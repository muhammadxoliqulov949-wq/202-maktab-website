/** Universal API response contract (Phase 2+). */

export type ApiMeta = {
  requestId?: string;
  cache?: "HIT" | "MISS";
  /** pagination metadata where applicable */
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "CONFLICT"
  | "UNAUTHORIZED";

export type ApiFailure = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** field-level validation details (never sensitive) */
    details?: Array<{ field: string; message: string }>;
  };
  meta?: ApiMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** A route handler result produced by controllers, adapted to a Response by the wrapper. */
export type HandlerResult = {
  status: number;
  body: ApiResponse<unknown>;
  /** cache-control TTL for public read-only payloads (0 = do not cache) */
  ttlSec?: number;
  cache?: "HIT" | "MISS";
  extraHeaders?: Record<string, string>;
};

/**
 * Locale-ready design note:
 * Content models currently carry single-locale (Uzbek) fields.
 * In Phase 3+, localized resources should either become
 * `{ uz: string; ru?: string }` values or per-locale rows keyed by `locale`.
 * Repository interfaces here return plain shapes so that mapping layer
 * can be introduced without touching controllers or the frontend.
 */
