import { wrap } from "@/server/http/handler";
import { adminMediaDelete } from "@/server/controllers/admin";

export const DELETE = wrap("admin", (ctx) => adminMediaDelete(ctx.req, ctx.params.id));
