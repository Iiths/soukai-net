import { useState, useEffect } from 'react';
import { GetNinjaDetailUseCase } from '../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
export function useNinjaDetail(id) {
    const [ninja, setNinja] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const repo = new JsonNinjaRepository();
                const useCase = new GetNinjaDetailUseCase(repo);
                const detail = await useCase.execute(id);
                setNinja(detail);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [id]);
    return { ninja, isLoading };
}
