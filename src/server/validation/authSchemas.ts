import { z } from "zod";

/**
 * Phase 4 — admin login credentials.
 * Deliberately permissive on the password shape: the real policy lives in
 * Supabase Auth, and a strict client-side rule would only create a different
 * error message for "account exists" vs "account does not".
 */
export const loginBody = z.object({
  email: z
    .string()
    .trim()
    .min(3, "Email is required")
    .max(254, "Email is too long")
    .email("Enter a valid email address")
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginBody>;
