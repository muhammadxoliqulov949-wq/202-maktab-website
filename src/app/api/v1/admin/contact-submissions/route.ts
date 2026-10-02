import { wrap } from "@/server/http/handler";
import { adminSubmissionsList } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminSubmissionsList(ctx.req));
