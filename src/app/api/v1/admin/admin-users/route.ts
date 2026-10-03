import { wrap } from "@/server/http/handler";
import { adminUsersList, adminUsersGrant } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminUsersList(ctx.req));
export const POST = wrap("admin", (ctx) => adminUsersGrant(ctx.req));
