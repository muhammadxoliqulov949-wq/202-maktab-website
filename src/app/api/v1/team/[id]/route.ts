import { wrap } from "@/server/http/handler";
import { teamItem } from "@/server/controllers";

export const GET = wrap("publicRead", (ctx) => teamItem(ctx.params.id));
