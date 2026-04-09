import ninjasData from '../../data/ninjas.json';
/** JSON の null → undefined 変換（TypeScript の strict null checks 対応） */
function normalizeNinja(raw) {
    const r = raw;
    const nullable = (v) => (v === null ? undefined : v);
    return {
        id: r.id,
        name: r.name,
        realName: nullable(r.realName),
        aliases: nullable(r.aliases),
        ninjaType: nullable(r.ninjaType),
        ninjaSoul: nullable(r.ninjaSoul),
        organizations: nullable(r.organizations),
        appearances: r.appearances ?? [],
        skills: nullable(r.skills),
        role: nullable(r.role),
        appearance: nullable(r.appearance),
        description: nullable(r.description),
        status: nullable(r.status),
        imageUrl: nullable(r.imageUrl),
        wikiUrl: nullable(r.wikiUrl),
    };
}
export class JsonNinjaRepository {
    async findAll() {
        return ninjasData.map(normalizeNinja);
    }
    async findById(id) {
        const raw = ninjasData.find((n) => n.id === id);
        return raw ? normalizeNinja(raw) : null;
    }
}
