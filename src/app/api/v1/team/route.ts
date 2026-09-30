import { wrap } from "@/server/http/handler";
import { teamList } from "@/server/controllers";

export const GET = wrap("search", (ctx) => teamList(ctx.req));
