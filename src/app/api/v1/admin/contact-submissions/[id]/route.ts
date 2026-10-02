import { wrap } from "@/server/http/handler";
import { adminSubmissionDelete, adminSubmissionStatus } from "@/server/controllers/admin";

export const PATCH = wrap("admin", (ctx) => adminSubmissionStatus(ctx.req, ctx.params.id));
export const DELETE = wrap("admin", (ctx) => adminSubmissionDelete(ctx.req, ctx.params.id));
