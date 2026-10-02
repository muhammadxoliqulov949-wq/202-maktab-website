/** Structured logger — JSON lines to stdout. Never logs bodies, headers with credentials, cookies, or tokens. */

type Level = "debug" | "info" | "warn" | "error";

type LogFields = {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
};

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function level(): Level {
  try {
    // avoid hard import cycle with config/env
    const lvl = (process.env.LOG_LEVEL as Level) || "info";
    return lvl in LEVEL_ORDER ? lvl : "info";
  } catch {
    return "info";
  }
}

function emit(lvl: Level, msg: string, fields: LogFields = {}) {
  if (LEVEL_ORDER[lvl] < LEVEL_ORDER[level()]) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level: lvl, msg, ...fields });
  // eslint-disable-next-line no-console
  process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};
