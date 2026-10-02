import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/server/openapi";
import { getEnv } from "@/server/config/env";

/** OpenAPI 3 spec — exposure configurable (default: enabled outside production). */
export function GET(): Response {
  const env = getEnv();
  const docsEnabled = env.API_DOCS_ENABLED ?? env.NODE_ENV !== "production";
  if (!docsEnabled) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  const origin = env.API_ORIGIN ?? env.APP_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:3000";
  return NextResponse.json(buildOpenApiSpec(origin), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
