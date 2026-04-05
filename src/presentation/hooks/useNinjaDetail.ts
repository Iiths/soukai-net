import { useState, useEffect } from 'react';
import { Ninja } from '../../domain/entities/Ninja';
import { GetNinjaDetailUseCase } from '../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';

export function useNinjaDetail(id: string) {
  const [ninja, setNinja] = useState<Ninja | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const repo = new JsonNinjaRepository();
        const useCase = new GetNinjaDetailUseCase(repo);
        const detail = await useCase.execute(id);
        setNinja(detail);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  return { ninja, isLoading };
}
