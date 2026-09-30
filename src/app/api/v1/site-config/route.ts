import { wrap } from "@/server/http/handler";
import { siteConfig } from "@/server/controllers";

export const GET = wrap("publicRead", () => siteConfig());
