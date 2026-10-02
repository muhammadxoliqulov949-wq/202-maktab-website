import { wrap } from "@/server/http/handler";
import { adminContactInfoGet, adminContactInfoPatch } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminContactInfoGet(ctx.req));
export const PATCH = wrap("admin", (ctx) => adminContactInfoPatch(ctx.req));
