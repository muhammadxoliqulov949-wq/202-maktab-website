import { wrap } from "@/server/http/handler";
import { galleryList } from "@/server/controllers";

export const GET = wrap("publicRead", (ctx) => galleryList(ctx.req));
