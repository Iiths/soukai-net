export class SearchNinjaUseCase {
    constructor(repo) {
        Object.defineProperty(this, "repo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: repo
        });
    }
    async execute(query) {
        const ninjas = await this.repo.findAll();
        const lowerQuery = query.toLowerCase();
        return ninjas.filter((ninja) => {
            const nameMatch = ninja.name.toLowerCase().includes(lowerQuery);
            const aliasMatch = ninja.aliases?.some((alias) => alias.toLowerCase().includes(lowerQuery));
            const soulMatch = ninja.ninjaSoul?.name
                .toLowerCase()
                .includes(lowerQuery);
            return nameMatch || aliasMatch || soulMatch;
        });
    }
}
