import { wrap } from "@/server/http/handler";
import { adminSettingsGet, adminSettingsPatch } from "@/server/controllers/admin";

export const GET = wrap("admin", (ctx) => adminSettingsGet(ctx.req));
export const PATCH = wrap("admin", (ctx) => adminSettingsPatch(ctx.req));
