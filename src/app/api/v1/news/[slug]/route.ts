import { wrap } from "@/server/http/handler";
import { newsItem } from "@/server/controllers";

export const GET = wrap("publicRead", (ctx) => newsItem(ctx.params.slug));
