export class FilterNinjaUseCase {
    constructor(ninjaRepo, episodeRepo) {
        Object.defineProperty(this, "ninjaRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ninjaRepo
        });
        Object.defineProperty(this, "episodeRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: episodeRepo
        });
    }
    async execute(criteria) {
        const ninjas = await this.ninjaRepo.findAll();
        // エピソードフィルターが必要な場合のみ episodes.json を読み込む
        const needsEpisodeFilter = criteria.arc !== undefined ||
            criteria.season !== undefined ||
            criteria.episodeTitle !== undefined;
        let episodeMap = new Map();
        if (needsEpisodeFilter) {
            const allEpisodes = await this.episodeRepo.findAll();
            episodeMap = new Map(allEpisodes.map((ep) => [ep.id, ep]));
        }
        return ninjas.filter((ninja) => {
            // 登場部フィルター
            if (criteria.arc) {
                const arcMatch = ninja.appearances.some((ref) => {
                    const ep = episodeMap.get(ref.id);
                    return ep?.arc?.includes(criteria.arc);
                });
                if (!arcMatch)
                    return false;
            }
            // 登場シーズンフィルター
            if (criteria.season !== undefined) {
                const seasonMatch = ninja.appearances.some((ref) => {
                    const ep = episodeMap.get(ref.id);
                    return ep?.season === criteria.season;
                });
                if (!seasonMatch)
                    return false;
            }
            // エピソードタイトルフィルター（部分一致）
            if (criteria.episodeTitle) {
                const epMatch = ninja.appearances.some((ref) => {
                    const ep = episodeMap.get(ref.id);
                    return ep?.title.toLowerCase().includes(criteria.episodeTitle.toLowerCase());
                });
                if (!epMatch)
                    return false;
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
                if (!ninja.ninjaSoul?.clan
                    ?.toLowerCase()
                    .includes(criteria.ninjaSoulClan.toLowerCase())) {
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
                const orgMatch = ninja.organizations?.some((org) => org.name.includes(criteria.organizationName));
                if (!orgMatch)
                    return false;
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
