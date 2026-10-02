import { wrap } from "@/server/http/handler";
import { faqs } from "@/server/controllers";

export const GET = wrap("publicRead", () => faqs());
