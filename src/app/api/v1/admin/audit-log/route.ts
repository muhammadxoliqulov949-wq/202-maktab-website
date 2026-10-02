import { wrap } from "@/server/http/handler";
import { adminAuditList } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminAuditList(ctx.req));
