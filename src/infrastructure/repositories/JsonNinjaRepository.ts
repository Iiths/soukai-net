import { Ninja } from '../../domain/entities/Ninja';
import { NinjaRepository } from '../../domain/repositories/NinjaRepository';
import ninjasData from '../../data/ninjas.json';

/** JSON の null → undefined 変換（TypeScript の strict null checks 対応） */
function normalizeNinja(raw: unknown): Ninja {
  const r = raw as Record<string, unknown>;
  const nullable = (v: unknown) => (v === null ? undefined : v);

  return {
    id: r.id as string,
    name: r.name as string,
    realName: nullable(r.realName) as string | undefined,
    aliases: nullable(r.aliases) as string[] | undefined,
    ninjaType: nullable(r.ninjaType) as Ninja['ninjaType'],
    ninjaSoul: nullable(r.ninjaSoul) as Ninja['ninjaSoul'],
    organizations: nullable(r.organizations) as Ninja['organizations'],
    appearances: (r.appearances as Ninja['appearances']) ?? [],
    skills: nullable(r.skills) as string[] | undefined,
    description: nullable(r.description) as string | undefined,
    status: nullable(r.status) as Ninja['status'],
    imageUrl: nullable(r.imageUrl) as string | undefined,
    wikiUrl: nullable(r.wikiUrl) as string | undefined,
  };
}

export class JsonNinjaRepository implements NinjaRepository {
  async findAll(): Promise<Ninja[]> {
    return (ninjasData as unknown[]).map(normalizeNinja);
  }

  async findById(id: string): Promise<Ninja | null> {
    const raw = (ninjasData as unknown[]).find(
      (n) => (n as Record<string, unknown>).id === id
    );
    return raw ? normalizeNinja(raw) : null;
  }
}
