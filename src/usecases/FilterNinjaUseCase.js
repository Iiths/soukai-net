export class FilterNinjaUseCase {
    constructor(repo) {
        Object.defineProperty(this, "repo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: repo
        });
    }
    async execute(criteria) {
        const ninjas = await this.repo.findAll();
        return ninjas.filter((ninja) => {
            if (criteria.arc) {
                const arcMatch = ninja.appearances.some((app) => app.arc?.includes(criteria.arc));
                if (!arcMatch)
                    return false;
            }
            if (criteria.ninjaSoulName) {
                if (!ninja.ninjaSoul?.name.includes(criteria.ninjaSoulName)) {
                    return false;
                }
            }
            if (criteria.organizationName) {
                const orgMatch = ninja.organizations?.some((org) => org.name.includes(criteria.organizationName));
                if (!orgMatch)
                    return false;
            }
            if (criteria.status) {
                if (ninja.status !== criteria.status) {
                    return false;
                }
            }
            return true;
        });
    }
}
