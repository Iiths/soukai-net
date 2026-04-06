import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ninja } from '../../../domain/entities/Ninja';
import { FilterCriteria, FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { SearchNinjaUseCase } from '../../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import styles from './SimpleSearchPage.module.css';

export function SimpleSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<string>('');
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [results, setResults] = useState<Ninja[]>([]);
  const [allNinjas, setAllNinjas] = useState<Ninja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  // 全ニンジャ一覧を初回ロード
  useEffect(() => {
    const repo = new JsonNinjaRepository();
    repo.findAll().then(setAllNinjas);
  }, []);

  // フィルターパネル用の選択肢を動的に生成
  const arcs = useMemo(() => {
    const s = new Set<string>();
    allNinjas.forEach((n) => n.appearances.forEach((a) => { if (a.arc) s.add(a.arc); }));
    return Array.from(s).sort();
  }, [allNinjas]);

  const seasons = useMemo(() => {
    const s = new Set<number>();
    allNinjas.forEach((n) => n.appearances.forEach((a) => { if (a.season !== undefined) s.add(a.season); }));
    return Array.from(s).sort((a, b) => a - b);
  }, [allNinjas]);

  const ninjaSouls = useMemo(() => {
    const s = new Set<string>();
    allNinjas.forEach((n) => { if (n.ninjaSoul) s.add(n.ninjaSoul.name); });
    return Array.from(s).sort();
  }, [allNinjas]);

  const ninjaSoulClans = useMemo(() => {
    const s = new Set<string>();
    allNinjas.forEach((n) => { if (n.ninjaSoul?.clan) s.add(n.ninjaSoul.clan); });
    return Array.from(s).sort();
  }, [allNinjas]);

  const organizations = useMemo(() => {
    const s = new Set<string>();
    allNinjas.forEach((n) => n.organizations?.forEach((o) => s.add(o.name)));
    return Array.from(s).sort();
  }, [allNinjas]);

  // 名前検索 + 詳細フィルターを組み合わせた検索
  const performSearch = useCallback(async (q: string, c: FilterCriteria) => {
    setIsLoading(true);
    try {
      const repo = new JsonNinjaRepository();
      let base: Ninja[];

      if (q.trim()) {
        // 名前・別名で絞り込み
        const searchUseCase = new SearchNinjaUseCase(repo);
        base = await searchUseCase.execute(q);
      } else {
        base = await repo.findAll();
      }

      // さらに詳細フィルターを適用（criteria が空なら全件通過）
      const hasFilter = Object.values(c).some((v) => v !== undefined && v !== '');
      if (hasFilter) {
        const filterUseCase = new FilterNinjaUseCase({ findAll: async () => base, findById: async (id) => base.find((n) => n.id === id) ?? null });
        base = await filterUseCase.execute(c);
      }

      setResults(base);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    performSearch(q, criteria);
  };

  const handleCriteriaChange = (c: FilterCriteria) => {
    setCriteria(c);
    performSearch(query, c);
  };

  const handleCardClick = (id: string) => {
    navigate(`/ninja/${id}`);
  };

  const hasActiveFilter = Object.values(criteria).some((v) => v !== undefined && v !== '');
  const isSearching = query.trim() || hasActiveFilter;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ニンジャを検索</h1>
        <p className={styles.subtitle}>名前または別名で検索します</p>
      </div>

      <div className={styles.searchSection}>
        <SearchBar value={query} onChange={handleSearch} />
        <button
          className={`${styles.filterToggle} ${filterOpen ? styles.filterToggleActive : ''} ${hasActiveFilter ? styles.filterToggleHasFilter : ''}`}
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
        >
          <span className={styles.filterToggleIcon}>{filterOpen ? '▲' : '▼'}</span>
          詳細フィルター
          {hasActiveFilter && <span className={styles.filterBadge}>ON</span>}
        </button>
      </div>

      {filterOpen && (
        <div className={styles.filterSection}>
          <FilterPanel
            criteria={criteria}
            onChange={handleCriteriaChange}
            arcs={arcs}
            seasons={seasons}
            ninjaSouls={ninjaSouls}
            ninjaSoulClans={ninjaSoulClans}
            organizations={organizations}
          />
        </div>
      )}

      {isLoading && (
        <div className={styles.loading}>検索中...</div>
      )}

      {!isLoading && isSearching && results.length === 0 && (
        <div className={styles.noResults}>
          条件に合うニンジャが見つかりませんでした
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

      {!isLoading && !isSearching && (
        <div className={styles.empty}>
          <p>ニンジャの名前を入力するか、詳細フィルターで絞り込んでください</p>
        </div>
      )}
    </div>
  );
}
