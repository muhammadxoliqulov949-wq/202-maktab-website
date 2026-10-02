import { wrap } from "@/server/http/handler";
import { adminMediaList } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminMediaList(ctx.req));
