/**
 * Shared SQL text helpers for the migration gates (scripts/check-sql.mjs,
 * scripts/verify-migrations.mjs).
 *
 * Both tools must see the file the way PostgreSQL does: `$$` dollar quoting and
 * single-quoted strings (with `''` escapes) are opaque, and `--` comments are
 * noise. Naive `split(";")` / `split(";\n")` shreds trigger bodies and reports
 * bogus "unterminated dollar-quoted string" errors, so the splitting lives here,
 * once, and is shared.
 */

/**
 * Split a script into executable statements (trailing `;` consumed).
 * @param {string} sql
 * @returns {{text: string, line: number}[]} line is the 1-based file line the statement starts on
 */
export function splitStatements(sql) {
  const out = [];
  let cur = "";
  let start = -1;
  let line = 1;
  let inDollar = false;
  let inString = false;

  const push = () => {
    const text = cur.trim();
    if (text) out.push({ text, line: start === -1 ? line : start });
    cur = "";
    start = -1;
  };

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "\n") line++;

    // `$$` … `$$` — anything inside (including `;`) is part of the statement.
    if (!inString && sql.startsWith("$$", i)) {
      inDollar = !inDollar;
      cur += "$$";
      i++;
      continue;
    }
    // single-quoted literal, `''` is an escaped quote
    if (!inDollar && ch === "'") {
      if (inString && sql[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inString = !inString;
    }
    // `--` comment runs to end of line
    if (!inDollar && !inString && ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      line++;
      continue;
    }
    if (!inDollar && !inString && ch === ";") {
      push();
      continue;
    }
    if (start === -1 && /\S/.test(ch)) start = line;
    cur += ch;
  }
  push();
  return out;
}

/**
 * Strip `--` line comments and block comments, honouring strings and `$$` quoting.
 * Structural assertions must run on this output: a comment that *explains* a bug
 * would otherwise be matched as if the bug were present in the SQL.
 * @param {string} sql
 */
export function stripComments(sql) {
  let out = "";
  let inString = false;
  let inDollar = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (!inString && sql.startsWith("$$", i)) {
      inDollar = !inDollar;
      out += "$$";
      i++;
      continue;
    }
    if (!inDollar && ch === "'") {
      if (inString && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inString = !inString;
      out += ch;
      continue;
    }
    if (!inDollar && !inString && ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (!inDollar && !inString && ch === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i++;
      out += " ";
      continue;
    }
    out += ch;
  }
  return out;
}

/** First non-empty line, trimmed — for human-readable failure output. */
export function firstLine(sql) {
  return (
    sql
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? ""
  );
}
