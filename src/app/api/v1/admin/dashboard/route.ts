import { wrap } from "@/server/http/handler";
import { adminDashboard } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminDashboard(ctx.req));
