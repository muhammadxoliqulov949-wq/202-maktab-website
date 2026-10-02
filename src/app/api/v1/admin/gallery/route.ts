import { wrap } from "@/server/http/handler";
import { adminCollectionCreate, adminCollectionList } from "@/server/controllers/admin";

const entity = "gallery";

export const GET = wrap("admin", (ctx) => adminCollectionList(ctx.req, entity));
export const POST = wrap("admin", (ctx) => adminCollectionCreate(ctx.req, entity));
