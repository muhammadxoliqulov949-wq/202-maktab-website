"use client";

import { useMemo, useState } from "react";
import { PersonCard } from "@/components/sections/TeamSection";
import { Icon } from "@/components/ui/Icon";
import { PEOPLE, TEAM_CATEGORIES } from "@/data/people";

const PAGE_SIZE = 8;

/** Team browser — search + category filter + «load more». Data-driven; Phase-3 swaps the source. */
export function TeamExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Barchasi");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEOPLE.filter((p) => {
      const matchesCat = category === "Barchasi" || p.category === category;
      const matchesQ =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.subject ?? "").toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, category]);

  const shown = filtered.slice(0, visible);
  const isFiltered = query.trim() !== "" || category !== "Barchasi";

  return (
    <div>
      {/* controls */}
      <div className="mb-9 grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-center">
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            className="field !pl-12"
            placeholder="Ism yoki fan bo‘yicha qidirish..."
            value={query}
            aria-label="Jamoa a'zolari bo'yicha qidiruv"
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Kategoriyalar bo'yicha filtr">
          {TEAM_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="fpill"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setVisible(PAGE_SIZE);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {shown.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <div className="n flex flex-col items-center gap-4 p-16 text-center">
          <span className="tile-ico !h-14 !w-14">
            <Icon name="search" size={26} />
          </span>
          <h2 className="h3">Hech narsa topilmadi</h2>
          <p className="max-w-[40ch] text-[0.93rem] text-muted">
            «{query}» bo‘yicha jamoa a’zosi topilmadi. Boshqa ism yoki fan bilan urinib ko‘ring.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQuery("");
              setCategory("Barchasi");
            }}
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}

      {/* load more */}
      {filtered.length > visible ? (
        <div className="mt-10 flex justify-center">
          <button type="button" className="btn btn-primary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Yana ko‘rsatish ({filtered.length - visible})
            <Icon name="arrow-down" size={17} />
          </button>
        </div>
      ) : null}

      {/* live count */}
      <p className="mt-8 text-center text-[0.84rem] font-semibold text-faint" role="status">
        {shown.length} / {PEOPLE.length} jamoa a’zosi ko‘rsatilmoqda{isFiltered ? " (filtrlangan)" : ""}
      </p>
    </div>
  );
}
