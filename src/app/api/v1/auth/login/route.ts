import { wrap } from "@/server/http/handler";
import { authLogin } from "@/server/controllers/auth";

/**
 * POST /api/v1/auth/login — Supabase Auth email + password sign-in.
 * Rate-limited per IP (wrap) and per submitted e-mail (controller).
 * Sets the HttpOnly session cookie; never returns a token.
 */
export const POST = wrap("auth", (ctx) => authLogin(ctx.req));
