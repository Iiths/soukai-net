import { useState, useEffect } from 'react';
import { GetNinjaDetailUseCase } from '../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
import { useNinjaEditContext } from '../context/NinjaEditContext';
export function useNinjaDetail(id) {
    const [ninja, setNinja] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { getOverride } = useNinjaEditContext();
    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                // in-memory 編集データを優先して使用
                const override = getOverride(id);
                if (override) {
                    setNinja(override);
                    return;
                }
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
    }, [id, getOverride]);
    return { ninja, isLoading };
}
