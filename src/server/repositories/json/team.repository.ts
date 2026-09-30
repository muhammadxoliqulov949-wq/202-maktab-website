import { PEOPLE } from "@/data/people";
import type { TeamRepository, TeamQuery } from "@/server/repositories/interfaces";
import { paginate } from "@/server/repositories/json/news.repository";

/** In-memory team repository (Phase 1 prototype people). Phase 3: DB implementation. */
class JsonTeamRepository implements TeamRepository {
  private readonly rows = PEOPLE.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    subject: p.subject ?? null,
    group: p.group,
    category: p.category,
    experience: p.experience,
    photo: p.photo || null,
    hasPhoto: Boolean(p.photo),
  }));

  private readonly byIdIndex = new Map(PEOPLE.map((p) => [p.id, p]));

  async list(q: TeamQuery) {
    let rows = [...this.rows];

    if (q.role) rows = rows.filter((r) => r.group === q.role);

    if (q.subject) {
      const needle = q.subject.toLowerCase();
      rows = rows.filter((r) => (r.subject ?? "").toLowerCase().includes(needle));
    }

    if (q.search) {
      const needle = q.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.role.toLowerCase().includes(needle) ||
          (r.subject ?? "").toLowerCase().includes(needle)
      );
    }

    return paginate(rows, q.page, q.limit);
  }

  async byId(id: string) {
    return this.byIdIndex.get(id) ?? null;
  }
}

export const jsonTeamRepository = new JsonTeamRepository();
