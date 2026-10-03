import type { ApiErrorCode } from "@/server/types/api";

/** Application error with a safe public message. Stack/internal info never leaves the process. */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Array<{ field: string; message: string }>;
  readonly retryAfterSec?: number;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    opts?: { details?: Array<{ field: string; message: string }>; retryAfterSec?: number }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = opts?.details;
    this.retryAfterSec = opts?.retryAfterSec;
  }

  static badRequest(message = "Bad request") {
    return new AppError("BAD_REQUEST", 400, message);
  }
  static validation(details: Array<{ field: string; message: string }>, message = "Validation failed") {
    return new AppError("VALIDATION_ERROR", 422, message, { details });
  }
  static notFound(message = "Resource not found") {
    return new AppError("NOT_FOUND", 404, message);
  }
  static methodNotAllowed(message = "Method not allowed") {
    return new AppError("METHOD_NOT_ALLOWED", 405, message);
  }
  static payloadTooLarge(message = "Request body too large") {
    return new AppError("PAYLOAD_TOO_LARGE", 413, message);
  }
  static unsupportedMediaType(message = "Unsupported content type") {
    return new AppError("UNSUPPORTED_MEDIA_TYPE", 415, message);
  }
  static rateLimited(retryAfterSec: number, message = "Too many requests") {
    return new AppError("RATE_LIMITED", 429, message, { retryAfterSec });
  }
  static internal(message = "Internal server error") {
    return new AppError("INTERNAL_ERROR", 500, message);
  }
  static conflict(message = "Conflict") {
    return new AppError("CONFLICT", 409, message);
  }
  static unauthorized(message = "Unauthorized") {
    return new AppError("UNAUTHORIZED", 401, message);
  }
  static forbidden(message = "Forbidden") {
    return new AppError("FORBIDDEN", 403, message);
  }
  static csrf(message = "Cross-site request rejected") {
    return new AppError("CSRF_FAILED", 403, message);
  }
  static serviceUnavailable(message = "Service temporarily unavailable") {
    return new AppError("SERVICE_UNAVAILABLE", 503, message);
  }
}

/** Convert zod issues into safe field details. */
export function zodDetails(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.map((i) => ({ field: i.path.join(".") || "_root", message: i.message }));
}
