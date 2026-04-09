import { Episode } from '../../domain/entities/Episode';
import { EpisodeRepository } from '../../domain/repositories/EpisodeRepository';
import episodesData from '../../data/episodes.json';

function normalizeEpisode(raw: unknown): Episode {
  const r = raw as Record<string, unknown>;
  const ep: Episode = {
    id: r.id as string,
    title: r.title as string,
  };
  if (r.arc != null) ep.arc = r.arc as string;
  if (r.season != null) ep.season = r.season as number;
  return ep;
}

export class JsonEpisodeRepository implements EpisodeRepository {
  private cache: Map<string, Episode> | null = null;

  private async getAll(): Promise<Map<string, Episode>> {
    if (!this.cache) {
      this.cache = new Map(
        (episodesData as unknown[]).map(normalizeEpisode).map((ep) => [ep.id, ep])
      );
    }
    return this.cache;
  }

  async findAll(): Promise<Episode[]> {
    const map = await this.getAll();
    return Array.from(map.values());
  }

  async findById(id: string): Promise<Episode | null> {
    const map = await this.getAll();
    return map.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Episode[]> {
    const map = await this.getAll();
    return ids.flatMap((id) => {
      const ep = map.get(id);
      return ep ? [ep] : [];
    });
  }
}
