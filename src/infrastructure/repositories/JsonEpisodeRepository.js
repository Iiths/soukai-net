import episodesData from '../../data/episodes.json';
function normalizeEpisode(raw) {
    const r = raw;
    const ep = {
        id: r.id,
        title: r.title,
    };
    if (r.arc != null)
        ep.arc = r.arc;
    if (r.season != null)
        ep.season = r.season;
    return ep;
}
export class JsonEpisodeRepository {
    constructor() {
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    async getAll() {
        if (!this.cache) {
            this.cache = new Map(episodesData.map(normalizeEpisode).map((ep) => [ep.id, ep]));
        }
        return this.cache;
    }
    async findAll() {
        const map = await this.getAll();
        return Array.from(map.values());
    }
    async findById(id) {
        const map = await this.getAll();
        return map.get(id) ?? null;
    }
    async findByIds(ids) {
        const map = await this.getAll();
        return ids.flatMap((id) => {
            const ep = map.get(id);
            return ep ? [ep] : [];
        });
    }
}
