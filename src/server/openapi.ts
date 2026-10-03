/**
 * OpenAPI 3.0 specification — served at /api/docs when API_DOCS_ENABLED=true.
 * Hand-maintained single source; response envelope matches src/server/types/api.
 */
const envelope = (dataSchema: object) => ({
  type: "object",
  required: ["success", "data", "meta"],
  properties: {
    success: { type: "boolean", enum: [true] },
    data: dataSchema,
    meta: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        cache: { type: "string", enum: ["HIT", "MISS"] },
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
  },
});

const errorEnvelope = {
  type: "object",
  required: ["success", "error"],
  properties: {
    success: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: {
          type: "string",
          enum: [
            "BAD_REQUEST",
            "VALIDATION_ERROR",
            "NOT_FOUND",
            "METHOD_NOT_ALLOWED",
            "PAYLOAD_TOO_LARGE",
            "UNSUPPORTED_MEDIA_TYPE",
            "RATE_LIMITED",
            "INTERNAL_ERROR",
          ],
        },
        message: { type: "string" },
        details: {
          type: "array",
          items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } },
        },
      },
    },
    meta: { type: "object" },
  },
};

const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 12 } },
];

export function buildOpenApiSpec(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "202-maktab API",
      version: "1.0.0",
      description:
        "Public API for the School 202 website (Phase 2). Read endpoints are cacheable; contact submissions are rate-limited and queued.",
    },
    servers: [{ url: origin }],
    tags: [
      { name: "health" },
      { name: "content" },
      { name: "news" },
      { name: "team" },
      { name: "gallery" },
      { name: "contact" },
      { name: "auth", description: "Phase 4 authentication. Credentials are verified by Supabase Auth; the session lives in an HttpOnly cookie. No endpoint returns a token." },
      { name: "admin", description: "Admin API — requires a Supabase Auth session cookie for an active admin_users record. 401 without a session, 403 for non-admins. Unsafe methods also require the x-csrf-token double-submit header." },
    ],
    paths: {
      "/api/v1/auth/login": { post: { tags: ["auth"], summary: "Email + password sign-in (rate limited per IP and per e-mail)", responses: { 200: { description: "Authenticated admin" }, 401: { description: "Invalid credentials (single generic message)" }, 403: { description: "Authenticated but not an active admin" }, 422: { description: "Validation error" }, 429: { description: "Too many attempts" } } } },
      "/api/v1/auth/logout": { post: { tags: ["auth"], summary: "Revoke the refresh token and clear the session + CSRF cookies", responses: { 200: { description: "OK" } } } },
      "/api/v1/auth/session": { get: { tags: ["auth"], summary: "Non-sensitive session summary — never returns tokens", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/admin-users": {
        get: { tags: ["admin"], summary: "List administrators + the role catalogue (permission: admin.manage)", responses: { 200: { description: "OK" }, 403: { description: "Forbidden" } } },
        post: { tags: ["admin"], summary: "Link an existing Supabase Auth user id to a role", responses: { 201: { description: "Created" }, 422: { description: "Validation error" } } },
      },
      "/api/v1/admin/admin-users/{id}": {
        patch: { tags: ["admin"], summary: "Activate / deactivate / change role", responses: { 200: { description: "OK" } } },
        delete: { tags: ["admin"], summary: "Remove admin access (cannot remove yourself)", responses: { 200: { description: "OK" } } },
      },
      "/api/v1/admin/media": {
        get: { tags: ["admin"], summary: "List media assets (permission: media.read)", responses: { 200: { description: "OK" } } },
        post: { tags: ["admin"], summary: "Multipart upload (permission: media.write). MIME + extension + size validated; Storage write runs under the admin's own JWT.", responses: { 201: { description: "Created" }, 413: { description: "Too large" }, 415: { description: "Unsupported type" } } },
      },
      "/api/v1/admin/media/{id}": { delete: { tags: ["admin"], summary: "Delete a media asset + its Storage object", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } } },
      "/api/v1/admin/dashboard": { get: { tags: ["admin"], summary: "Dashboard counts + recent activity", responses: { 200: { description: "OK" }, 401: { description: "No valid session" }, 403: { description: "Not an active admin / CSRF failure" } } } },
      "/api/v1/admin/news": {
        get: { tags: ["admin"], summary: "List articles incl. drafts (status filter)", responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
        post: { tags: ["admin"], summary: "Create article (unique slug, 409 on conflict)", responses: { 201: { description: "Created" }, 409: { description: "Slug conflict" }, 422: { description: "Validation error" } } },
      },
      "/api/v1/admin/news/{id}": {
        get: { tags: ["admin"], summary: "Get article by id (drafts included)", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
        patch: { tags: ["admin"], summary: "Update article / publish / unpublish (audit: PUBLISH|UNPUBLISH)", responses: { 200: { description: "OK" }, 409: { description: "Slug conflict" } } },
        delete: { tags: ["admin"], summary: "Archive (soft) by default; ?hard=true permanent", responses: { 200: { description: "OK" } } },
      },
      "/api/v1/admin/{collection}": { get: { tags: ["admin"], summary: "List collection: team|gallery|faqs|facilities|features|statistics|quick-links", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/{collection}/order": { put: { tags: ["admin"], summary: "Reorder: { ids: [...] } (audit: REORDER)", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/settings": { get: { tags: ["admin"], summary: "Site settings", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/contact-info": { patch: { tags: ["admin"], summary: "Update official contact info", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/contact-submissions": { get: { tags: ["admin"], summary: "ADMIN-ONLY inbox (never public)", responses: { 200: { description: "OK" } } } },
      "/api/v1/admin/audit-log": { get: { tags: ["admin"], summary: "Audit trail", responses: { 200: { description: "OK" } } } },
      "/api/v1/health": { get: { tags: ["health"], summary: "Service health", responses: { 200: { description: "OK", content: { "application/json": { schema: envelope({ type: "object" }) } } } } } },
      "/api/v1/health/live": { get: { tags: ["health"], summary: "Liveness probe", responses: { 200: { description: "OK" } } } },
      "/api/v1/health/ready": { get: { tags: ["health"], summary: "Readiness probe", responses: { 200: { description: "OK" } } } },
      "/api/v1/site-config": { get: { tags: ["content"], summary: "Site identity & meta config", responses: { 200: { description: "OK" }, 429: { description: "Rate limited", content: { "application/json": { schema: errorEnvelope } } } } } },
      "/api/v1/stats": { get: { tags: ["content"], summary: "School statistics (prototype values)", responses: { 200: { description: "OK" } } } },
      "/api/v1/features": { get: { tags: ["content"], summary: "Education experience features", responses: { 200: { description: "OK" } } } },
      "/api/v1/facilities": { get: { tags: ["content"], summary: "Facilities list", responses: { 200: { description: "OK" } } } },
      "/api/v1/faqs": { get: { tags: ["content"], summary: "FAQ entries", responses: { 200: { description: "OK" } } } },
      "/api/v1/quick-links": { get: { tags: ["content"], summary: "Quick access links", responses: { 200: { description: "OK" } } } },
      "/api/v1/contact-info": { get: { tags: ["content"], summary: "Contact info incl. map coordinates (prototype)", responses: { 200: { description: "OK" } } } },
      "/api/v1/news": {
        get: {
          tags: ["news"],
          summary: "News list with filters/search/pagination",
          parameters: [
            { name: "category", in: "query", schema: { type: "string", enum: ["Yangiliklar", "Tadbirlar", "Sport", "Tanlovlar", "Ochiq darslar"] } },
            { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["date-desc", "date-asc", "title"], default: "date-desc" } },
            ...paginationParams,
          ],
          responses: { 200: { description: "OK" }, 422: { description: "Validation error", content: { "application/json": { schema: errorEnvelope } } } },
        },
      },
      "/api/v1/news/{slug}": {
        get: {
          tags: ["news"],
          summary: "News article by slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" }, 404: { description: "Not found", content: { "application/json": { schema: errorEnvelope } } } },
        },
      },
      "/api/v1/team": {
        get: {
          tags: ["team"],
          summary: "Team list with filters/search/pagination",
          parameters: [
            { name: "role", in: "query", schema: { type: "string", enum: ["leadership", "teachers", "administration"] } },
            { name: "subject", in: "query", schema: { type: "string", maxLength: 60 } },
            { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
            ...paginationParams,
          ],
          responses: { 200: { description: "OK" }, 422: { description: "Validation error" } },
        },
      },
      "/api/v1/team/{id}": {
        get: {
          tags: ["team"],
          summary: "Team member by id",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
        },
      },
      "/api/v1/gallery": {
        get: {
          tags: ["gallery"],
          summary: "Gallery metadata (media served statically)",
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["image", "video"] } },
            { name: "category", in: "query", schema: { type: "string", maxLength: 40 } },
            ...paginationParams,
          ],
          responses: { 200: { description: "OK" }, 422: { description: "Validation error" } },
        },
      },
      "/api/v1/gallery/{id}": {
        get: {
          tags: ["gallery"],
          summary: "Gallery item by id",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
        },
      },
      "/api/v1/contact": {
        post: {
          tags: ["contact"],
          summary: "Submit the contact form (validated, spam-checked, queued; not persisted in Phase 2)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "contact", "message"],
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 80 },
                    contact: { type: "string", description: "email or phone", minLength: 5, maxLength: 120 },
                    topic: { type: "string", enum: ["admission", "school", "documents", "cooperation", "other"] },
                    message: { type: "string", minLength: 10, maxLength: 2000 },
                    website: { type: "string", description: "honeypot — must be empty" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Accepted (queued)" },
            400: { description: "Malformed JSON" },
            413: { description: "Payload too large" },
            415: { description: "Unsupported media type" },
            422: { description: "Validation error", content: { "application/json": { schema: errorEnvelope } } },
            429: { description: "Rate limited", content: { "application/json": { schema: errorEnvelope } } },
          },
        },
      },
    },
    components: {
      schemas: { ApiError: errorEnvelope },
    },
  } as const;
}
