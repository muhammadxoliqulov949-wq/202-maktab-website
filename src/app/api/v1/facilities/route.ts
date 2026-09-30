import { wrap } from "@/server/http/handler";
import { facilities } from "@/server/controllers";

export const GET = wrap("publicRead", () => facilities());
