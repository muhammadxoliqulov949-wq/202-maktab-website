import { wrap } from "@/server/http/handler";
import { health } from "@/server/controllers";

export const dynamic = "force-dynamic";
export const GET = wrap("none", () => health());
