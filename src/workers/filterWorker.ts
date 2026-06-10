import type { Ninja, NinjaType } from '../domain/entities/Ninja';
import type { Episode } from '../domain/entities/Episode';
import type { NinjaSoulGrade } from '../domain/entities/NinjaSoul';

export type FilterCriteria = {
  arc?: string;
  season?: number;
  episodeTitle?: string;
  episodeId?: string;
  ninjaSoulGrade?: NinjaSoulGrade;
  ninjaSoulClan?: string;
  ninjaType?: NinjaType;
  organizationId?: string;
  status?: 'alive' | 'dead' | 'unknown';
  role?: string;
  skill?: string;
};

export interface FilterRequest {
  id: number;
  criteria: FilterCriteria;
}

export interface FilterResponse {
  id: number;
  results: Ninja[];
}

// Worker 内キャッシュ
let ninjasCache: Ninja[] | null = null;
let episodesCache: Episode[] | null = null;

async function loadData(): Promise<void> {
  if (!ninjasCache) {
    const res = await fetch('/data/ninjas.json');
    ninjasCache = await res.json() as Ninja[];
  }
  if (!episodesCache) {
    const res = await fetch('/data/episodes.json');
    episodesCache = await res.json() as Episode[];
  }
}

function applyFilter(ninjas: Ninja[], episodes: Episode[], criteria: FilterCriteria): Ninja[] {
  const needsEpisodeMap =
    criteria.arc !== undefined ||
    criteria.season !== undefined ||
    criteria.episodeTitle !== undefined;

  const episodeMap = needsEpisodeMap
    ? new Map(episodes.map((ep) => [ep.id, ep]))
    : new Map<string, Episode>();

  return ninjas.filter((ninja) => {
    if (criteria.arc) {
      const match = ninja.appearances.some((ref) => episodeMap.get(ref.id)?.arc?.includes(criteria.arc!));
      if (!match) return false;
    }
    if (criteria.season !== undefined) {
      const match = ninja.appearances.some((ref) => episodeMap.get(ref.id)?.season === criteria.season);
      if (!match) return false;
    }
    if (criteria.episodeTitle) {
      const match = ninja.appearances.some((ref) =>
        episodeMap.get(ref.id)?.title.toLowerCase().includes(criteria.episodeTitle!.toLowerCase())
      );
      if (!match) return false;
    }
    if (criteria.episodeId) {
      if (!ninja.appearances.some((ref) => ref.id === criteria.episodeId)) return false;
    }
    if (criteria.ninjaSoulGrade && ninja.ninjaSoul?.grade !== criteria.ninjaSoulGrade) return false;
    if (criteria.ninjaSoulClan &&
        ninja.ninjaSoul?.clan?.toLowerCase() !== criteria.ninjaSoulClan.toLowerCase()) return false;
    if (criteria.ninjaType && ninja.ninjaType !== criteria.ninjaType) return false;
    if (criteria.organizationId) {
      if (!ninja.organizations?.some((ref) => ref.id === criteria.organizationId)) return false;
    }
    if (criteria.status && ninja.status !== criteria.status) return false;
    if (criteria.role && !ninja.role?.toLowerCase().includes(criteria.role.toLowerCase())) return false;
    if (criteria.skill) {
      if (!ninja.skills?.some((s) => s.toLowerCase().includes(criteria.skill!.toLowerCase()))) return false;
    }
    return true;
  });
}

self.onmessage = async (e: MessageEvent<FilterRequest>) => {
  const { id, criteria } = e.data;
  await loadData();
  const results = applyFilter(ninjasCache!, episodesCache!, criteria);
  (self as unknown as Worker).postMessage({ id, results } satisfies FilterResponse);
};
