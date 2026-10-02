import { wrap } from "@/server/http/handler";
import { newsList } from "@/server/controllers";

export const GET = wrap("search", (ctx) => newsList(ctx.req));
