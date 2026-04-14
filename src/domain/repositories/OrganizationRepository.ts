import { Organization } from '../entities/Organization';

export interface OrganizationRepository {
  findAll(): Promise<Organization[]>;
  findById(id: string): Promise<Organization | null>;
  findByIds(ids: string[]): Promise<Organization[]>;
}
