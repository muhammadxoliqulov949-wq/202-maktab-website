/** Small shared helpers. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const EASE = "cubic-bezier(0.22, 0.68, 0, 1)";
