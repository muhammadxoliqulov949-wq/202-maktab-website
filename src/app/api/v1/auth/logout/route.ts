import { wrap } from "@/server/http/handler";
import { authLogout } from "@/server/controllers/auth";

/** POST /api/v1/auth/logout — revokes the refresh token and clears cookies. */
export const POST = wrap("auth", (ctx) => authLogout(ctx.req));
