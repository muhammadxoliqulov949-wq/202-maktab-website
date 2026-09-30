import { z } from "zod";
import { queue } from "@/server/queue";
import { logger } from "@/server/observability/logger";
import { metrics } from "@/server/observability/metrics";
import { contactBody, type ContactInput } from "@/server/validation/schemas";
import { AppError, zodDetails } from "@/server/errors/AppError";
import { getEnv } from "@/server/config/env";

/**
 * Spam-protection abstraction.
 * Phase 2: lightweight heuristics (honeypot + link count). No external services.
 * Phase 4+: swap/implement provider (e.g., turnstile) behind the same interface.
 */
export interface SpamFilter {
  check(input: ContactInput): { spam: boolean; reason?: string };
}

export class NullSpamFilter implements SpamFilter {
  check(): { spam: boolean; reason?: string } {
    return { spam: false };
  }
}

export class HeuristicSpamFilter implements SpamFilter {
  check(input: ContactInput): { spam: boolean; reason?: string } {
    if (input.website && input.website.length > 0) return { spam: true, reason: "honeypot" };
    const links = (input.message.match(/https?:\/\//g) ?? []).length;
    if (links > 3) return { spam: true, reason: "too_many_links" };
    if (/(viagra|casino|crypto giveaway)/i.test(input.message)) return { spam: true, reason: "keyword" };
    return { spam: false };
  }
}

export function getSpamFilter(): SpamFilter {
  return getEnv().SPAM_FILTER === "heuristic" ? new HeuristicSpamFilter() : new NullSpamFilter();
}

/**
 * ContactSubmissionService — validates, normalizes, spam-checks and hands the
 * submission to the queue. Phase 2 does NOT persist submissions; the queue
 * handler logs a count only. Phase 3/4: register a handler that stores to DB
 * and/or sends email — this service does not change.
 */
export class ContactSubmissionService {
  private readonly spam: SpamFilter;

  constructor(spam: SpamFilter) {
    this.spam = spam;
  }

  normalize(raw: ContactInput): ContactInput {
    const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
    const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    return {
      ...raw,
      name: collapse(stripControl(raw.name)),
      contact: stripControl(raw.contact).trim(),
      message: collapse(stripControl(raw.message)),
      topic: raw.topic,
    };
  }

  async submit(payload: unknown): Promise<{ accepted: true; topic: string }> {
    const parsed = contactBody.safeParse(payload);
    if (!parsed.success) {
      throw AppError.validation(zodDetails(parsed.error.issues));
    }

    const input = this.normalize(parsed.data);
    const spam = this.spam.check(input);
    if (spam.spam) {
      // Deliberately indistinguishable from accepted — do not feed spammers signals.
      metrics.increment("contact_spam_total");
      logger.warn("contact_spam_detected", { reason: spam.reason });
      return { accepted: true, topic: input.topic };
    }

    await queue.enqueue("contact-submission", {
      name: input.name,
      contact: input.contact,
      topic: input.topic,
      messageLength: input.message.length, // never log full message content
      at: new Date().toISOString(),
    });
    metrics.increment("contact_accepted_total");

    return { accepted: true, topic: input.topic };
  }
}

const g = globalThis as unknown as { __m202ContactService?: ContactSubmissionService };

export function getContactService(): ContactSubmissionService {
  if (!g.__m202ContactService) {
    g.__m202ContactService = new ContactSubmissionService(getSpamFilter());
  }
  return g.__m202ContactService;
}

/** Phase 2 queue processor: audit-log only (privacy: no content, no raw contact). */
export function registerContactQueueHandler() {
  queue.process<{ topic: string; messageLength: number }>("contact-submission", (task) => {
    logger.info("contact_submission", { topic: task.topic, messageLength: task.messageLength });
  });
}
