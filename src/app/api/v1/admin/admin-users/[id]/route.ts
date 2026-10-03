import { wrap } from "@/server/http/handler";
import { adminUserPatch, adminUserRemove } from "@/server/controllers/admin";

export const PATCH = wrap("admin", (ctx) => adminUserPatch(ctx.req, ctx.params.id));
export const DELETE = wrap("admin", (ctx) => adminUserRemove(ctx.req, ctx.params.id));
