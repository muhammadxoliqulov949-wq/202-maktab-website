import { wrap } from "@/server/http/handler";
import { adminCollectionReorder } from "@/server/controllers/admin";

const entity = "features";

export const PUT = wrap("admin", (ctx) => adminCollectionReorder(ctx.req, entity));
