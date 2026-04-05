import { Ninja } from '../../domain/entities/Ninja';
import { NinjaRepository } from '../../domain/repositories/NinjaRepository';
import ninjasData from '../../data/ninjas.json';

export class JsonNinjaRepository implements NinjaRepository {
  async findAll(): Promise<Ninja[]> {
    return ninjasData as Ninja[];
  }

  async findById(id: string): Promise<Ninja | null> {
    const ninja = ninjasData.find((n: Ninja) => n.id === id);
    return ninja || null;
  }
}
