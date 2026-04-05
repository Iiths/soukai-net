import { Ninja } from '../entities/Ninja';

export interface NinjaRepository {
  findAll(): Promise<Ninja[]>;
  findById(id: string): Promise<Ninja | null>;
}
