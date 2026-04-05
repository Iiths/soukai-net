export class GetNinjaDetailUseCase {
    constructor(repo) {
        Object.defineProperty(this, "repo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: repo
        });
    }
    async execute(id) {
        return this.repo.findById(id);
    }
}
