import { wrap } from "@/server/http/handler";
import { contactInfo } from "@/server/controllers";

export const GET = wrap("publicRead", () => contactInfo());
