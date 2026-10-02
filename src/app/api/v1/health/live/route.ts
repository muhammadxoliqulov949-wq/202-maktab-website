import { wrap } from "@/server/http/handler";
import { healthLive } from "@/server/controllers";

export const dynamic = "force-dynamic";
export const GET = wrap("none", () => healthLive());
