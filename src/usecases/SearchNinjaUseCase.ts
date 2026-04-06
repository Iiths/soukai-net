import { Ninja } from '../domain/entities/Ninja';
import { NinjaRepository } from '../domain/repositories/NinjaRepository';

export class SearchNinjaUseCase {
  constructor(private repo: NinjaRepository) {}

  /**
   * 名前・別名で部分一致検索する（ニンジャソウル名は含まない）
   */
  async execute(query: string): Promise<Ninja[]> {
    const ninjas = await this.repo.findAll();
    const lowerQuery = query.toLowerCase();

    return ninjas.filter((ninja) => {
      const nameMatch = ninja.name.toLowerCase().includes(lowerQuery);
      const aliasMatch = ninja.aliases?.some((alias) =>
        alias.toLowerCase().includes(lowerQuery)
      );

      return nameMatch || aliasMatch;
    });
  }
}
