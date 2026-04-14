import { Organization } from '../../domain/entities/Organization';
import { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import organizationsData from '../../data/organizations.json';

function normalizeOrganization(raw: unknown): Organization {
  const r = raw as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
  };
}

export class JsonOrganizationRepository implements OrganizationRepository {
  private cache: Map<string, Organization> | null = null;

  private async getAll(): Promise<Map<string, Organization>> {
    if (!this.cache) {
      this.cache = new Map(
        (organizationsData as unknown[]).map(normalizeOrganization).map((org) => [org.id, org])
      );
    }
    return this.cache;
  }

  async findAll(): Promise<Organization[]> {
    const map = await this.getAll();
    return Array.from(map.values());
  }

  async findById(id: string): Promise<Organization | null> {
    const map = await this.getAll();
    return map.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Organization[]> {
    const map = await this.getAll();
    return ids.flatMap((id) => {
      const org = map.get(id);
      return org ? [org] : [];
    });
  }
}
