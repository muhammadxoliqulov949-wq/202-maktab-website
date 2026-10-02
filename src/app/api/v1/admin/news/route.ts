import { wrap } from "@/server/http/handler";
import { adminNewsCreate, adminNewsList } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminNewsList(ctx.req));
export const POST = wrap("admin", (ctx) => adminNewsCreate(ctx.req));
