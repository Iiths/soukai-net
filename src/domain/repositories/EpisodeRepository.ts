import { Episode } from '../entities/Episode';

export interface EpisodeRepository {
  findAll(): Promise<Episode[]>;
  findById(id: string): Promise<Episode | null>;
  findByIds(ids: string[]): Promise<Episode[]>;
}
