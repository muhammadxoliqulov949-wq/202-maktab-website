import { wrap } from "@/server/http/handler";
import { stats } from "@/server/controllers";

export const GET = wrap("publicRead", () => stats());
