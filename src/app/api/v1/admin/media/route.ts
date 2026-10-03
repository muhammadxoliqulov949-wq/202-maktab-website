import { wrap } from "@/server/http/handler";
import { adminMediaList, adminMediaUpload } from "@/server/controllers/admin";

/**
 * GET  /api/v1/admin/media       — list media assets (media.read)
 * POST /api/v1/admin/media       — multipart upload (media.write)
 */
export const GET = wrap("admin", (ctx) => adminMediaList(ctx.req));
export const POST = wrap("admin", (ctx) => adminMediaUpload(ctx.req));
