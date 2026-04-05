import { Ninja } from '../domain/entities/Ninja';
import { NinjaRepository } from '../domain/repositories/NinjaRepository';

export type FilterCriteria = {
  arc?: string;
  ninjaSoulName?: string;
  organizationName?: string;
  status?: 'alive' | 'dead' | 'unknown';
};

export class FilterNinjaUseCase {
  constructor(private repo: NinjaRepository) {}

  async execute(criteria: FilterCriteria): Promise<Ninja[]> {
    const ninjas = await this.repo.findAll();

    return ninjas.filter((ninja) => {
      if (criteria.arc) {
        const arcMatch = ninja.appearances.some((app) =>
          app.arc?.includes(criteria.arc!)
        );
        if (!arcMatch) return false;
      }

      if (criteria.ninjaSoulName) {
        if (!ninja.ninjaSoul?.name.includes(criteria.ninjaSoulName)) {
          return false;
        }
      }

      if (criteria.organizationName) {
        const orgMatch = ninja.organizations?.some((org) =>
          org.name.includes(criteria.organizationName!)
        );
        if (!orgMatch) return false;
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
