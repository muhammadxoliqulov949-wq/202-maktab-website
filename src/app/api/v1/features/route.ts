import { wrap } from "@/server/http/handler";
import { features } from "@/server/controllers";

export const GET = wrap("publicRead", () => features());
