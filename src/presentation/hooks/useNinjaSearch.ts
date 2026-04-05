import { useState, useCallback } from 'react';
import { Ninja } from '../../domain/entities/Ninja';
import { SearchNinjaUseCase } from '../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';

export function useNinjaSearch() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Ninja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const search = useCallback(async (searchQuery: string) => {
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { query, results, isLoading, search };
}
