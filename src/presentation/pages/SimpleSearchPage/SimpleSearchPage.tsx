import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ninja } from '../../../domain/entities/Ninja';
import { NinjaType } from '../../../domain/entities/Ninja';
import { Episode } from '../../../domain/entities/Episode';
import { Organization } from '../../../domain/entities/Organization';
import { FilterCriteria, FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { NinjaSoulGrade } from '../../../domain/entities/NinjaSoul';
import { SearchNinjaUseCase } from '../../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { JsonEpisodeRepository } from '../../../infrastructure/repositories/JsonEpisodeRepository';
import { JsonOrganizationRepository } from '../../../infrastructure/repositories/JsonOrganizationRepository';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import styles from './SimpleSearchPage.module.css';

// ----- URL パラメータキー定数 -----
const P = {
  QUERY:         'q',
  FILTER_OPEN:   'filter',
  ARC:           'arc',
  SEASON:        'season',
  EPISODE_TITLE: 'ep',
  SOUL_GRADE:    'grade',
  SOUL_CLAN:     'clan',
  NINJA_TYPE:    'type',
  ORG:           'org',
  STATUS:        'status',
  ROLE:          'role',
  SKILL:         'skill',
} as const;

const FILTER_PARAM_KEYS = [
  P.ARC, P.SEASON, P.EPISODE_TITLE,
  P.SOUL_GRADE, P.SOUL_CLAN,
  P.NINJA_TYPE, P.ORG, P.STATUS,
  P.ROLE, P.SKILL,
] as const;

// ----- URL ↔ FilterCriteria 変換 -----

function paramsToFilterCriteria(sp: URLSearchParams): FilterCriteria {
  const c: FilterCriteria = {};
  const arc    = sp.get(P.ARC);           if (arc)    c.arc           = arc;
  const season = sp.get(P.SEASON);        if (season) c.season        = Number(season);
  const ep     = sp.get(P.EPISODE_TITLE); if (ep)     c.episodeTitle  = ep;
  const grade  = sp.get(P.SOUL_GRADE);    if (grade)  c.ninjaSoulGrade = grade as NinjaSoulGrade;
  const clan   = sp.get(P.SOUL_CLAN);     if (clan)   c.ninjaSoulClan = clan;
  const type   = sp.get(P.NINJA_TYPE);    if (type)   c.ninjaType     = type as NinjaType;
  const org    = sp.get(P.ORG);           if (org)    c.organizationId = org;
  const status = sp.get(P.STATUS);        if (status) c.status        = status as 'alive' | 'dead' | 'unknown';
  const role   = sp.get(P.ROLE);          if (role)   c.role          = role;
  const skill  = sp.get(P.SKILL);         if (skill)  c.skill         = skill;
  return c;
}

function filterCriteriaToEntries(c: FilterCriteria): [string, string][] {
  const entries: [string, string][] = [];
  if (c.arc)                  entries.push([P.ARC,           c.arc]);
  if (c.season !== undefined) entries.push([P.SEASON,        String(c.season)]);
  if (c.episodeTitle)         entries.push([P.EPISODE_TITLE, c.episodeTitle]);
  if (c.ninjaSoulGrade)       entries.push([P.SOUL_GRADE,    c.ninjaSoulGrade]);
  if (c.ninjaSoulClan)        entries.push([P.SOUL_CLAN,     c.ninjaSoulClan]);
  if (c.ninjaType)            entries.push([P.NINJA_TYPE,    c.ninjaType]);
  if (c.organizationId)       entries.push([P.ORG,           c.organizationId]);
  if (c.status)               entries.push([P.STATUS,        c.status]);
  if (c.role)                 entries.push([P.ROLE,          c.role]);
  if (c.skill)                entries.push([P.SKILL,         c.skill]);
  return entries;
}

// ----- コンポーネント -----

export function SimpleSearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL が Single Source of Truth — ローカル state は持たない
  const query      = searchParams.get(P.QUERY) ?? '';
  const filterOpen = searchParams.get(P.FILTER_OPEN) === '1';
  const criteria   = useMemo(() => paramsToFilterCriteria(searchParams), [searchParams]);

  const [results,          setResults]          = useState<Ninja[]>([]);
  const [allNinjas,        setAllNinjas]        = useState<Ninja[]>([]);
  const [allEpisodes,      setAllEpisodes]      = useState<Episode[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoading,        setIsLoading]        = useState<boolean>(false);

  // 全ニンジャ・全エピソード・全組織を初回ロード
  useEffect(() => {
    Promise.all([
      new JsonNinjaRepository().findAll(),
      new JsonEpisodeRepository().findAll(),
      new JsonOrganizationRepository().findAll(),
    ]).then(([ninjas, episodes, orgs]) => {
      setAllNinjas(ninjas);
      setAllEpisodes(episodes);
      setAllOrganizations(orgs.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    });
  }, []);

  // 組織名解決用マップ
  const orgMap = useMemo(
    () => new Map(allOrganizations.map((o) => [o.id, o])),
    [allOrganizations]
  );

  // フィルターパネル用の選択肢を生成
  const arcs = useMemo(() => {
    const s = new Set<string>();
    allEpisodes.forEach((ep) => { if (ep.arc) s.add(ep.arc); });
    return Array.from(s).sort();
  }, [allEpisodes]);

  const seasons = useMemo(() => {
    const s = new Set<number>();
    allEpisodes.forEach((ep) => { if (ep.season !== undefined) s.add(ep.season); });
    return Array.from(s).sort((a, b) => a - b);
  }, [allEpisodes]);

  const ninjaSoulClans = useMemo(() => {
    const s = new Set<string>();
    allNinjas.forEach((n) => { if (n.ninjaSoul?.clan) s.add(n.ninjaSoul.clan); });
    return Array.from(s).sort();
  }, [allNinjas]);

  // organizations は allOrganizations をそのまま使用（organizations.json から一元管理）

  // 検索実行
  const performSearch = useCallback(async (q: string, c: FilterCriteria) => {
    setIsLoading(true);
    try {
      const ninjaRepo   = new JsonNinjaRepository();
      const episodeRepo = new JsonEpisodeRepository();
      let base: Ninja[];

      if (q.trim()) {
        const searchUseCase = new SearchNinjaUseCase(ninjaRepo);
        base = await searchUseCase.execute(q);
      } else {
        base = await ninjaRepo.findAll();
      }

      const hasFilter = Object.values(c).some((v) => v !== undefined && v !== '');
      if (hasFilter) {
        const filterUseCase = new FilterNinjaUseCase(
          { findAll: async () => base, findById: async (id) => base.find((n) => n.id === id) ?? null },
          episodeRepo,
        );
        base = await filterUseCase.execute(c);
      }

      // あいうえお順（カタカナ・ひらがな）でソート
      base.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      setResults(base);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // URL パラメータが変わるたびに検索を実行（詳細ページから戻った時も含む）
  useEffect(() => {
    const q = searchParams.get(P.QUERY) ?? '';
    const c = paramsToFilterCriteria(searchParams);
    const hasFilter = Object.values(c).some((v) => v !== undefined && v !== '');
    if (q.trim() || hasFilter) {
      performSearch(q, c);
    } else {
      setResults([]);
    }
  // searchParams の参照が変わった時だけ実行すれば良いため、他の依存は意図的に省略
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ----- ハンドラー（URL を replace で更新するだけ → 検索履歴をブラウザに積まない） -----

  const handleSearch = (q: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set(P.QUERY, q); else next.delete(P.QUERY);
      return next;
    }, { replace: true });
  };

  const handleCriteriaChange = (c: FilterCriteria) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      FILTER_PARAM_KEYS.forEach((k) => next.delete(k));
      filterCriteriaToEntries(c).forEach(([k, v]) => next.set(k, v));
      return next;
    }, { replace: true });
  };

  const handleFilterToggle = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filterOpen) next.delete(P.FILTER_OPEN); else next.set(P.FILTER_OPEN, '1');
      return next;
    }, { replace: true });
  };

  const handleCardClick = (id: string) => {
    navigate(`/ninja/${id}`);
  };

  const hasActiveFilter = Object.values(criteria).some((v) => v !== undefined && v !== '');
  const isSearching     = query.trim() || hasActiveFilter;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img src="/soukai-icon.png" alt="SOUKAI.NET" className={styles.titleIcon} />
        <h1 className={styles.title}>◆ニンジャ検索重点◆</h1>
        <p className={styles.subtitle}>名前・別名・組織・登場部で検索できます</p>
      </div>

      <div className={styles.searchSection}>
        <SearchBar value={query} onChange={handleSearch} />
        <button
          className={`${styles.filterToggle} ${filterOpen ? styles.filterToggleActive : ''} ${hasActiveFilter ? styles.filterToggleHasFilter : ''}`}
          onClick={handleFilterToggle}
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
            ninjaSoulClans={ninjaSoulClans}
            organizations={allOrganizations}
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
          <p className={styles.resultCount}>
            <strong>{results.length}</strong> 件のニンジャが見つかりました
          </p>
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

      {!isLoading && !isSearching && (
        <div className={styles.empty}>
          <p>ニンジャの名前を入力するか、詳細フィルターで絞り込んでください</p>
        </div>
      )}
    </div>
  );
}
