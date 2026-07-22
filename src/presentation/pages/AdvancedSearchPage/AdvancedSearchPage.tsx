import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterCriteria } from '../../../usecases/FilterNinjaUseCase';
import { JsonEpisodeRepository } from '../../../infrastructure/repositories/JsonEpisodeRepository';
import { JsonOrganizationRepository } from '../../../infrastructure/repositories/JsonOrganizationRepository';
import { useFilterWorker } from '../../../hooks/useFilterWorker';
import { Ninja } from '../../../domain/entities/Ninja';
import { Episode } from '../../../domain/entities/Episode';
import { Organization } from '../../../domain/entities/Organization';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import styles from './AdvancedSearchPage.module.css';

export function AdvancedSearchPage() {
  const navigate = useNavigate();
  const filterWorker = useFilterWorker();
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [results, setResults] = useState<Ninja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);

  // 組織名解決用マップ
  const orgMap = useMemo(
    () => new Map(allOrganizations.map((o) => [o.id, o])),
    [allOrganizations]
  );

  const arcs = useMemo(() => {
    const arcSet = new Set<string>();
    allEpisodes.forEach((ep) => {
      if (ep.arc) arcSet.add(ep.arc);
    });
    return Array.from(arcSet).sort();
  }, [allEpisodes]);

  useEffect(() => {
    const loadAll = async () => {
      const [episodes, orgs] = await Promise.all([
        new JsonEpisodeRepository().findAll(),
        new JsonOrganizationRepository().findAll(),
      ]);
      setAllEpisodes(episodes);
      setAllOrganizations(orgs.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    };
    loadAll();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const performFilter = async () => {
      setIsLoading(true);
      try {
        const filterResults = await filterWorker(criteria);
        if (cancelled) return;
        filterResults.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        setResults(filterResults);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    performFilter();
    return () => { cancelled = true; };
  }, [criteria, filterWorker]);

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
        organizations={allOrganizations}
        seasons={[]}
        episodes={allEpisodes}
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
                orgMap={orgMap}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
