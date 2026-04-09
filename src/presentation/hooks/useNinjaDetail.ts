import { useState, useEffect } from 'react';
import { Ninja } from '../../domain/entities/Ninja';
import { Episode } from '../../domain/entities/Episode';
import { GetNinjaDetailUseCase } from '../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
import { JsonEpisodeRepository } from '../../infrastructure/repositories/JsonEpisodeRepository';
import { useNinjaEditContext } from '../context/NinjaEditContext';

export function useNinjaDetail(id: string) {
  const [ninja, setNinja] = useState<Ninja | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { getOverride } = useNinjaEditContext();

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        // in-memory 編集データを優先して使用
        const override = getOverride(id);
        const ninjaData = override ?? await (async () => {
          const repo = new JsonNinjaRepository();
          const useCase = new GetNinjaDetailUseCase(repo);
          return await useCase.execute(id);
        })();

        setNinja(ninjaData);

        if (ninjaData && ninjaData.appearances.length > 0) {
          const episodeRepo = new JsonEpisodeRepository();
          const epIds = ninjaData.appearances.map((ref) => ref.id);
          const epDetails = await episodeRepo.findByIds(epIds);
          setEpisodes(epDetails);
        } else {
          setEpisodes([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, getOverride]);

  return { ninja, episodes, isLoading };
}
