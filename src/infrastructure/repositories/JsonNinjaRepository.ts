import { Ninja } from '../../domain/entities/Ninja';
import { NinjaRepository } from '../../domain/repositories/NinjaRepository';

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
    role: nullable(r.role) as string | undefined,
    appearance: nullable(r.appearance) as string | undefined,
    description: nullable(r.description) as string | undefined,
    status: nullable(r.status) as Ninja['status'],
    imageUrl: nullable(r.imageUrl) as string | undefined,
    wikiUrl: nullable(r.wikiUrl) as string | undefined,
  };
}

export class JsonNinjaRepository implements NinjaRepository {
  private cache: unknown[] | null = null;

  private async getRaw(): Promise<unknown[]> {
    if (!this.cache) {
      const res = await fetch('/data/ninjas.json');
      if (!res.ok) throw new Error(`Failed to fetch ninjas.json: ${res.status}`);
      this.cache = await res.json() as unknown[];
    }
    return this.cache;
  }

  async findAll(): Promise<Ninja[]> {
    const raw = await this.getRaw();
    return raw.map(normalizeNinja);
  }

  async findById(id: string): Promise<Ninja | null> {
    const raw = await this.getRaw();
    const found = raw.find(
      (n) => (n as Record<string, unknown>).id === id
    );
    return found ? normalizeNinja(found) : null;
  }
}
