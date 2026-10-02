import { wrap } from "@/server/http/handler";
import { adminCollectionDelete, adminCollectionGet, adminCollectionUpdate } from "@/server/controllers/admin";

const entity = "statistics";

export const GET = wrap("admin", (ctx) => adminCollectionGet(ctx.req, entity, ctx.params.id));
export const PATCH = wrap("admin", (ctx) => adminCollectionUpdate(ctx.req, entity, ctx.params.id));
export const DELETE = wrap("admin", (ctx) => adminCollectionDelete(ctx.req, entity, ctx.params.id));
