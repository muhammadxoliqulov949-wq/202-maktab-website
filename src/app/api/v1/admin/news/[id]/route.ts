import { wrap } from "@/server/http/handler";
import { adminNewsDelete, adminNewsGet, adminNewsUpdate } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminNewsGet(ctx.req, ctx.params.id));
export const PATCH = wrap("admin", (ctx) => adminNewsUpdate(ctx.req, ctx.params.id));
export const DELETE = wrap("admin", (ctx) => adminNewsDelete(ctx.req, ctx.params.id));
