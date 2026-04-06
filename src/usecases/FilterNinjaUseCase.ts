import { Ninja, NinjaType } from '../domain/entities/Ninja';
import { NinjaSoulGrade } from '../domain/entities/NinjaSoul';
import { NinjaRepository } from '../domain/repositories/NinjaRepository';

export type FilterCriteria = {
  arc?: string;
  /** 登場シーズン（第4部以降のみ対象） */
  season?: number;
  /** エピソードタイトル（部分一致） */
  episodeTitle?: string;
  ninjaSoulName?: string;
  /** ニンジャソウルの等級 */
  ninjaSoulGrade?: NinjaSoulGrade;
  /** 所属ニンジャクラン（部分一致） */
  ninjaSoulClan?: string;
  /** ニンジャの種別 */
  ninjaType?: NinjaType;
  organizationName?: string;
  status?: 'alive' | 'dead' | 'unknown';
};

export class FilterNinjaUseCase {
  constructor(private repo: NinjaRepository) {}

  async execute(criteria: FilterCriteria): Promise<Ninja[]> {
    const ninjas = await this.repo.findAll();

    return ninjas.filter((ninja) => {
      // 登場部フィルター
      if (criteria.arc) {
        const arcMatch = ninja.appearances.some((app) =>
          app.arc?.includes(criteria.arc!)
        );
        if (!arcMatch) return false;
      }

      // 登場シーズンフィルター
      if (criteria.season !== undefined) {
        const seasonMatch = ninja.appearances.some(
          (app) => app.season === criteria.season
        );
        if (!seasonMatch) return false;
      }

      // エピソードタイトルフィルター（部分一致）
      if (criteria.episodeTitle) {
        const epMatch = ninja.appearances.some((app) =>
          app.title.toLowerCase().includes(criteria.episodeTitle!.toLowerCase())
        );
        if (!epMatch) return false;
      }

      // ニンジャソウル名フィルター
      if (criteria.ninjaSoulName) {
        if (!ninja.ninjaSoul?.name.includes(criteria.ninjaSoulName)) {
          return false;
        }
      }

      // ニンジャソウル等級フィルター
      if (criteria.ninjaSoulGrade) {
        if (ninja.ninjaSoul?.grade !== criteria.ninjaSoulGrade) {
          return false;
        }
      }

      // ニンジャクランフィルター（部分一致）
      if (criteria.ninjaSoulClan) {
        if (
          !ninja.ninjaSoul?.clan
            ?.toLowerCase()
            .includes(criteria.ninjaSoulClan.toLowerCase())
        ) {
          return false;
        }
      }

      // ニンジャタイプフィルター
      if (criteria.ninjaType) {
        if (ninja.ninjaType !== criteria.ninjaType) {
          return false;
        }
      }

      // 所属組織フィルター
      if (criteria.organizationName) {
        const orgMatch = ninja.organizations?.some((org) =>
          org.name.includes(criteria.organizationName!)
        );
        if (!orgMatch) return false;
      }

      // ステータスフィルター
      if (criteria.status) {
        if (ninja.status !== criteria.status) {
          return false;
        }
      }

      return true;
    });
  }
}
