import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterCriteria, FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { Ninja } from '../../../domain/entities/Ninja';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import styles from './AdvancedSearchPage.module.css';

export function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [results, setResults] = useState<Ninja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allNinjas, setAllNinjas] = useState<Ninja[]>([]);

  const arcs = useMemo(() => {
    const arcSet = new Set<string>();
    allNinjas.forEach((ninja) => {
      ninja.appearances.forEach((app) => {
        if (app.arc) arcSet.add(app.arc);
      });
    });
    return Array.from(arcSet).sort();
  }, [allNinjas]);

  const ninjaSouls = useMemo(() => {
    const soulSet = new Set<string>();
    allNinjas.forEach((ninja) => {
      if (ninja.ninjaSoul) soulSet.add(ninja.ninjaSoul.name);
    });
    return Array.from(soulSet).sort();
  }, [allNinjas]);

  const organizations = useMemo(() => {
    const orgSet = new Set<string>();
    allNinjas.forEach((ninja) => {
      ninja.organizations?.forEach((org) => {
        orgSet.add(org.name);
      });
    });
    return Array.from(orgSet).sort();
  }, [allNinjas]);

  useEffect(() => {
    const loadAllNinjas = async () => {
      const repo = new JsonNinjaRepository();
      const ninjas = await repo.findAll();
      setAllNinjas(ninjas);
    };
    loadAllNinjas();
  }, []);

  useEffect(() => {
    const performFilter = async () => {
      setIsLoading(true);
      try {
        const repo = new JsonNinjaRepository();
        const useCase = new FilterNinjaUseCase(repo);
        const filterResults = await useCase.execute(criteria);
        setResults(filterResults);
      } finally {
        setIsLoading(false);
      }
    };

    performFilter();
  }, [criteria]);

  const handleCardClick = (id: string) => {
    navigate(`/ninja/${id}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>詳細検索</h1>
        <p className={styles.subtitle}>
          複数の条件でニンジャを絞り込みます
        </p>
      </div>

      <FilterPanel
        criteria={criteria}
        onChange={setCriteria}
        arcs={arcs}
        ninjaSouls={ninjaSouls}
        organizations={organizations}
        seasons={[]}
        ninjaSoulClans={[]}
      />

      {isLoading && (
        <div className={styles.loading}>フィルタ中...</div>
      )}

      {!isLoading && results.length === 0 && (
        <div className={styles.noResults}>
          条件に合うニンジャが見つかりません
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className={styles.resultsSection}>
          <h2 className={styles.resultCount}>
            {results.length}件のニンジャが見つかりました
          </h2>
          <div className={styles.grid}>
            {results.map((ninja) => (
              <NinjaCard
                key={ninja.id}
                ninja={ninja}
                onClick={() => handleCardClick(ninja.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
