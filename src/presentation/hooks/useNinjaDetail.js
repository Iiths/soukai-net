import { useState, useEffect } from 'react';
import { GetNinjaDetailUseCase } from '../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
import { JsonEpisodeRepository } from '../../infrastructure/repositories/JsonEpisodeRepository';
import { useNinjaEditContext } from '../context/NinjaEditContext';
export function useNinjaDetail(id) {
    const [ninja, setNinja] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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
                }
                else {
                    setEpisodes([]);
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [id, getOverride]);
    return { ninja, episodes, isLoading };
}
