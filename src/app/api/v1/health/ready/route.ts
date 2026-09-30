import { wrap } from "@/server/http/handler";
import { healthReady } from "@/server/controllers";

export const dynamic = "force-dynamic";
export const GET = wrap("none", () => healthReady());
