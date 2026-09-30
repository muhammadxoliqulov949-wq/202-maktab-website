/**
 * Queue abstraction — Phase 2: inline (same-process, non-blocking enough for
 * a single log-write). Phase 3+: BullMQ/Redis adapter behind the same
 * interface so workers can run on separate instances.
 */

export type QueueHandler<T = unknown> = (payload: T) => Promise<void> | void;

export interface QueueProvider {
  /** Register the processor for a task name. */
  process<T>(name: string, handler: QueueHandler<T>): void;
  /** Schedule a task. Resolves once accepted (inline) — handler errors are logged, never thrown to callers. */
  enqueue<T>(name: string, payload: T): Promise<void>;
  stats(): { registered: string[]; processed: number; failed: number };
}

export class InlineQueueProvider implements QueueProvider {
  private handlers = new Map<string, QueueHandler<never>>();
  private processed = 0;
  private failed = 0;

  process<T>(name: string, handler: QueueHandler<T>): void {
    this.handlers.set(name, handler as QueueHandler<never>);
  }

  async enqueue<T>(name: string, payload: T): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      // A task with no processor is a configuration bug — fail loudly in logs, not to the client.
      const { logger } = await import("@/server/observability/logger");
      logger.error("queue_handler_missing", { task: name });
      this.failed++;
      return;
    }
    // setImmediate keeps the event loop responsive for the response path.
    return new Promise<void>((resolve) => {
      setImmediate(async () => {
        try {
          await (handler as QueueHandler<T>)(payload);
          this.processed++;
        } catch (err) {
          this.failed++;
          const { logger } = await import("@/server/observability/logger");
          logger.error("queue_task_failed", { task: name, error: String(err) });
        } finally {
          resolve();
        }
      });
    });
  }

  stats() {
    return { registered: [...this.handlers.keys()], processed: this.processed, failed: this.failed };
  }
}

const g = globalThis as unknown as { __m202Queue?: InlineQueueProvider };
export const queue: InlineQueueProvider = g.__m202Queue ?? new InlineQueueProvider();
g.__m202Queue = queue;
