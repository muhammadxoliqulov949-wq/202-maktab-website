import { wrap } from "@/server/http/handler";
import { contactSubmit } from "@/server/controllers";
import { AppError } from "@/server/errors/AppError";
import { registerContactQueueHandler } from "@/server/services/contact.service";

// Ensure the inline queue processor exists (idempotent per process).
registerContactQueueHandler();

export const POST = wrap("contact", (ctx) => contactSubmit(ctx.req));

export const GET = wrap("none", () => {
  throw AppError.methodNotAllowed("Use POST to submit the contact form");
});
