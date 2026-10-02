import { wrap } from "@/server/http/handler";
import { galleryItem } from "@/server/controllers";

export const GET = wrap("publicRead", (ctx) => galleryItem(ctx.params.id));
