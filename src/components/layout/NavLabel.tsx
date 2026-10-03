/**
 * NavLabel — tepa bardagi bo'lim nomini harflarga bo'lib chiqadi.
 *
 * Hover'da: harflar chapdan o'ngga ketma-ket kattalashadi. MUHIM: kattalashish
 * `font-size` orqali bo'ladi — shuning uchun harf o'z joyini ham kengaytiradi va
 * qo'shnilarini itarib suradi (bir-birining ustiga chiqmaydi, o'qish mumkin
 * bo'lib qoladi).
 *
 * Har bir harfga beriladigan o'zgaruvchilar:
 *   --i  indeks (navbat effekti uchun)
 *   --n  harflar soni (kursor ketganda teskari tartib uchun)
 *   --g  o'sish miqdori (em) — qancha katta bo'lishi
 *   --d  burilish yo'nalishi (+1 / -1) — multfilm "sakrash" effekti
 *
 * `--g`: unli harflar eng katta (1), undoshlar 0.78, tutuq/apostrof 0.5
 * koeffitsientini oladi; uzun so'zlarda umumiy o'sish biroz jilovlanadi —
 * shunda bar cho'zilib ketmaydi.
 */

import type { CSSProperties } from "react";

const VOWELS = new Set(["a", "e", "i", "o", "u", "A", "E", "I", "O", "U"]);
const MODIFIERS = new Set(["\u2018", "\u2019", "'", "`", "\u02bb", "\u02bc"]);

function amplitude(ch: string): number {
  if (MODIFIERS.has(ch)) return 0.5;
  if (VOWELS.has(ch)) return 1;
  return 0.78;
}

/** So'z uzunligiga qarab umumiy o'sish bazasi (em). */
function growthBase(n: number): number {
  if (n >= 10) return 0.5;
  if (n >= 8) return 0.58;
  return 0.68;
}

export function NavLabel({ text }: { text: string }) {
  const chars = Array.from(text);
  const base = growthBase(chars.length);

  return (
    <span className="nav-label">
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="nav-char"
          style={
            {
              "--i": i,
              "--n": chars.length,
              "--g": +(amplitude(ch) * base).toFixed(2),
              "--d": i % 2 === 0 ? -1 : 1,
            } as CSSProperties
          }
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}
