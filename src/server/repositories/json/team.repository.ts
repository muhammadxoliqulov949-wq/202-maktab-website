import type { TeamQuery, TeamRepository } from "@/server/repositories/interfaces";
import type { TeamListItemDto, TeamItemDto } from "@/server/repositories/types";
import { getStore } from "@/server/repositories/store";
import { toTeamItem, toTeamListItem } from "@/server/repositories/mappers";
import { paginate } from "@/server/repositories/json/news.repository";

/** JSON-provider team repository over the in-memory store (visible rows only). */
class JsonTeamRepository implements TeamRepository {
  async list(q: TeamQuery): Promise<{ items: TeamListItemDto[]; page: number; limit: number; total: number; totalPages: number }> {
    let rows = getStore().team.filter((r) => r.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);

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

    const page = paginate(rows, q.page, q.limit);
    return { ...page, items: page.items.map(toTeamListItem) };
  }

  async byId(id: string): Promise<TeamItemDto | null> {
    const row = getStore().team.find((r) => r.id === id && r.isVisible);
    return row ? toTeamItem(row) : null;
  }
}

export const jsonTeamRepository = new JsonTeamRepository();
