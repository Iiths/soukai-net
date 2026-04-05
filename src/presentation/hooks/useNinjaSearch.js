import { useState, useCallback } from 'react';
import { SearchNinjaUseCase } from '../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
export function useNinjaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const search = useCallback(async (searchQuery) => {
        setQuery(searchQuery);
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        try {
            const repo = new JsonNinjaRepository();
            const useCase = new SearchNinjaUseCase(repo);
            const searchResults = await useCase.execute(searchQuery);
            setResults(searchResults);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    return { query, results, isLoading, search };
}
