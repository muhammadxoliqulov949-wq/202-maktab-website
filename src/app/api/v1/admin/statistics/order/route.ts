import { wrap } from "@/server/http/handler";
import { adminCollectionReorder } from "@/server/controllers/admin";

const entity = "statistics";

export const PUT = wrap("admin", (ctx) => adminCollectionReorder(ctx.req, entity));
