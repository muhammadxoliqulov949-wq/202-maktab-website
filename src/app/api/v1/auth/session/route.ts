import { wrap } from "@/server/http/handler";
import { authSession } from "@/server/controllers/auth";

/**
 * GET /api/v1/auth/session — non-sensitive session summary
 * ({ authenticated, admin: { email, role, permissions } | null }).
 * Never returns tokens.
 */
export const GET = wrap("auth", (ctx) => authSession(ctx.req));
