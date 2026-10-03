/**
 * NavLabel — tepa bardagi bo'lim nomini harflarga bo'lib chiqadi.
 *
 * Nima uchun: hover'da butun so'z emas, aynan HARFLAR ketma-ket (chapdan
 * o'ngga) 3D kattalashib, olovrang tusga kiradi — to'lqin effekti.
 * Har bir harfga `--i` (indeks), `--n` (harflar soni) va `--k` (amplituda
 * koeffitsienti) beriladi; animatsiya butunlay CSS'da (globals.css).
 *
 * `--k`: unli harflar to'liq (1), undoshlar biroz kam (0.78), o'zbekcha
 * tutuq belgisi kabi qo'shimchalar yana kamroq (0.5) kattalashadi — shu
 * tufayli to'lqin tabiiy ko'rinadi.
 */

import type { CSSProperties } from "react";

const VOWELS = new Set(["a", "e", "i", "o", "u", "A", "E", "I", "O", "U"]);
const MODIFIERS = new Set(["\u2018", "\u2019", "'", "`", "\u02bb", "\u02bc"]);

function amplitude(ch: string): number {
  if (MODIFIERS.has(ch)) return 0.5;
  if (VOWELS.has(ch)) return 1;
  return 0.78;
}

export function NavLabel({ text }: { text: string }) {
  const chars = Array.from(text);

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
              "--k": amplitude(ch),
            } as CSSProperties
          }
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}
