import { Ninja } from '../domain/entities/Ninja';
import { NinjaRepository } from '../domain/repositories/NinjaRepository';

export class GetNinjaDetailUseCase {
  constructor(private repo: NinjaRepository) {}

  async execute(id: string): Promise<Ninja | null> {
    return this.repo.findById(id);
  }
}
