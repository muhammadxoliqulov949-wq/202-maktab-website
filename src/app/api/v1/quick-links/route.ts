import { wrap } from "@/server/http/handler";
import { quickLinks } from "@/server/controllers";

export const GET = wrap("publicRead", () => quickLinks());
