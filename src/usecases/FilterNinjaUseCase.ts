import { Ninja, NinjaType } from '../domain/entities/Ninja';
import { Episode } from '../domain/entities/Episode';
import { NinjaSoulGrade } from '../domain/entities/NinjaSoul';
import { NinjaRepository } from '../domain/repositories/NinjaRepository';
import { EpisodeRepository } from '../domain/repositories/EpisodeRepository';

export type FilterCriteria = {
  arc?: string;
  /** 登場シーズン（第4部以降のみ対象） */
  season?: number;
  /** エピソードタイトル（部分一致） */
  episodeTitle?: string;
  /** ニンジャソウルの等級 */
  ninjaSoulGrade?: NinjaSoulGrade;
  /** 所属ニンジャクラン（部分一致） */
  ninjaSoulClan?: string;
  /** ニンジャの種別 */
  ninjaType?: NinjaType;
  /** 所属組織ID（organizations.json の id） */
  organizationId?: string;
  status?: 'alive' | 'dead' | 'unknown';
  /** 役職（部分一致） */
  role?: string;
  /** ジツ・カラテなどのスキル（部分一致） */
  skill?: string;
};

export class FilterNinjaUseCase {
  constructor(
    private ninjaRepo: NinjaRepository,
    private episodeRepo: EpisodeRepository,
  ) {}

  async execute(criteria: FilterCriteria): Promise<Ninja[]> {
    const ninjas = await this.ninjaRepo.findAll();

    // エピソードフィルターが必要な場合のみ episodes.json を読み込む
    const needsEpisodeFilter =
      criteria.arc !== undefined ||
      criteria.season !== undefined ||
      criteria.episodeTitle !== undefined;

    let episodeMap: Map<string, Episode> = new Map();
    if (needsEpisodeFilter) {
      const allEpisodes = await this.episodeRepo.findAll();
      episodeMap = new Map(allEpisodes.map((ep) => [ep.id, ep]));
    }

    return ninjas.filter((ninja) => {
      // 登場部フィルター
      if (criteria.arc) {
        const arcMatch = ninja.appearances.some((ref) => {
          const ep = episodeMap.get(ref.id);
          return ep?.arc?.includes(criteria.arc!);
        });
        if (!arcMatch) return false;
      }

      // 登場シーズンフィルター
      if (criteria.season !== undefined) {
        const seasonMatch = ninja.appearances.some((ref) => {
          const ep = episodeMap.get(ref.id);
          return ep?.season === criteria.season;
        });
        if (!seasonMatch) return false;
      }

      // エピソードタイトルフィルター（部分一致）
      if (criteria.episodeTitle) {
        const epMatch = ninja.appearances.some((ref) => {
          const ep = episodeMap.get(ref.id);
          return ep?.title.toLowerCase().includes(criteria.episodeTitle!.toLowerCase());
        });
        if (!epMatch) return false;
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

      // 所属組織フィルター（IDで完全一致）
      if (criteria.organizationId) {
        const orgMatch = ninja.organizations?.some((ref) =>
          ref.id === criteria.organizationId
        );
        if (!orgMatch) return false;
      }

      // ステータスフィルター
      if (criteria.status) {
        if (ninja.status !== criteria.status) {
          return false;
        }
      }

      // 役職フィルター（部分一致）
      if (criteria.role) {
        if (!ninja.role?.toLowerCase().includes(criteria.role.toLowerCase())) {
          return false;
        }
      }

      // スキル（ジツ・カラテなど）フィルター（部分一致）
      if (criteria.skill) {
        const skillMatch = ninja.skills?.some((s) =>
          s.toLowerCase().includes(criteria.skill!.toLowerCase())
        );
        if (!skillMatch) return false;
      }

      return true;
    });
  }
}
