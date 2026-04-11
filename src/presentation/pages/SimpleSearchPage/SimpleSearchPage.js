import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { SearchNinjaUseCase } from '../../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { JsonEpisodeRepository } from '../../../infrastructure/repositories/JsonEpisodeRepository';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import styles from './SimpleSearchPage.module.css';
// ----- URL パラメータキー定数 -----
const P = {
    QUERY: 'q',
    FILTER_OPEN: 'filter',
    ARC: 'arc',
    SEASON: 'season',
    EPISODE_TITLE: 'ep',
    SOUL_NAME: 'soul',
    SOUL_GRADE: 'grade',
    SOUL_CLAN: 'clan',
    NINJA_TYPE: 'type',
    ORG: 'org',
    STATUS: 'status',
};
const FILTER_PARAM_KEYS = [
    P.ARC, P.SEASON, P.EPISODE_TITLE,
    P.SOUL_NAME, P.SOUL_GRADE, P.SOUL_CLAN,
    P.NINJA_TYPE, P.ORG, P.STATUS,
];
// ----- URL ↔ FilterCriteria 変換 -----
function paramsToFilterCriteria(sp) {
    const c = {};
    const arc = sp.get(P.ARC);
    if (arc)
        c.arc = arc;
    const season = sp.get(P.SEASON);
    if (season)
        c.season = Number(season);
    const ep = sp.get(P.EPISODE_TITLE);
    if (ep)
        c.episodeTitle = ep;
    const soul = sp.get(P.SOUL_NAME);
    if (soul)
        c.ninjaSoulName = soul;
    const grade = sp.get(P.SOUL_GRADE);
    if (grade)
        c.ninjaSoulGrade = grade;
    const clan = sp.get(P.SOUL_CLAN);
    if (clan)
        c.ninjaSoulClan = clan;
    const type = sp.get(P.NINJA_TYPE);
    if (type)
        c.ninjaType = type;
    const org = sp.get(P.ORG);
    if (org)
        c.organizationName = org;
    const status = sp.get(P.STATUS);
    if (status)
        c.status = status;
    return c;
}
function filterCriteriaToEntries(c) {
    const entries = [];
    if (c.arc)
        entries.push([P.ARC, c.arc]);
    if (c.season !== undefined)
        entries.push([P.SEASON, String(c.season)]);
    if (c.episodeTitle)
        entries.push([P.EPISODE_TITLE, c.episodeTitle]);
    if (c.ninjaSoulName)
        entries.push([P.SOUL_NAME, c.ninjaSoulName]);
    if (c.ninjaSoulGrade)
        entries.push([P.SOUL_GRADE, c.ninjaSoulGrade]);
    if (c.ninjaSoulClan)
        entries.push([P.SOUL_CLAN, c.ninjaSoulClan]);
    if (c.ninjaType)
        entries.push([P.NINJA_TYPE, c.ninjaType]);
    if (c.organizationName)
        entries.push([P.ORG, c.organizationName]);
    if (c.status)
        entries.push([P.STATUS, c.status]);
    return entries;
}
// ----- コンポーネント -----
export function SimpleSearchPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    // URL が Single Source of Truth — ローカル state は持たない
    const query = searchParams.get(P.QUERY) ?? '';
    const filterOpen = searchParams.get(P.FILTER_OPEN) === '1';
    const criteria = useMemo(() => paramsToFilterCriteria(searchParams), [searchParams]);
    const [results, setResults] = useState([]);
    const [allNinjas, setAllNinjas] = useState([]);
    const [allEpisodes, setAllEpisodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // 全ニンジャ・全エピソードを初回ロード
    useEffect(() => {
        Promise.all([
            new JsonNinjaRepository().findAll(),
            new JsonEpisodeRepository().findAll(),
        ]).then(([ninjas, episodes]) => {
            setAllNinjas(ninjas);
            setAllEpisodes(episodes);
        });
    }, []);
    // フィルターパネル用の選択肢を生成
    const arcs = useMemo(() => {
        const s = new Set();
        allEpisodes.forEach((ep) => { if (ep.arc)
            s.add(ep.arc); });
        return Array.from(s).sort();
    }, [allEpisodes]);
    const seasons = useMemo(() => {
        const s = new Set();
        allEpisodes.forEach((ep) => { if (ep.season !== undefined)
            s.add(ep.season); });
        return Array.from(s).sort((a, b) => a - b);
    }, [allEpisodes]);
    const ninjaSouls = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => { if (n.ninjaSoul?.name)
            s.add(n.ninjaSoul.name); });
        return Array.from(s).sort();
    }, [allNinjas]);
    const ninjaSoulClans = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => { if (n.ninjaSoul?.clan)
            s.add(n.ninjaSoul.clan); });
        return Array.from(s).sort();
    }, [allNinjas]);
    const organizations = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => n.organizations?.forEach((o) => s.add(o.name)));
        return Array.from(s).sort();
    }, [allNinjas]);
    // 検索実行
    const performSearch = useCallback(async (q, c) => {
        setIsLoading(true);
        try {
            const ninjaRepo = new JsonNinjaRepository();
            const episodeRepo = new JsonEpisodeRepository();
            let base;
            if (q.trim()) {
                const searchUseCase = new SearchNinjaUseCase(ninjaRepo);
                base = await searchUseCase.execute(q);
            }
            else {
                base = await ninjaRepo.findAll();
            }
            const hasFilter = Object.values(c).some((v) => v !== undefined && v !== '');
            if (hasFilter) {
                const filterUseCase = new FilterNinjaUseCase({ findAll: async () => base, findById: async (id) => base.find((n) => n.id === id) ?? null }, episodeRepo);
                base = await filterUseCase.execute(c);
            }
            setResults(base);
        }
        finally {
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
        }
        else {
            setResults([]);
        }
        // searchParams の参照が変わった時だけ実行すれば良いため、他の依存は意図的に省略
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    // ----- ハンドラー（URL を replace で更新するだけ → 検索履歴をブラウザに積まない） -----
    const handleSearch = (q) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (q)
                next.set(P.QUERY, q);
            else
                next.delete(P.QUERY);
            return next;
        }, { replace: true });
    };
    const handleCriteriaChange = (c) => {
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
            if (filterOpen)
                next.delete(P.FILTER_OPEN);
            else
                next.set(P.FILTER_OPEN, '1');
            return next;
        }, { replace: true });
    };
    const handleCardClick = (id) => {
        navigate(`/ninja/${id}`);
    };
    const hasActiveFilter = Object.values(criteria).some((v) => v !== undefined && v !== '');
    const isSearching = query.trim() || hasActiveFilter;
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.header, children: [_jsx("img", { src: "/soukai-icon.png", alt: "SOUKAI.NET", className: styles.titleIcon }), _jsx("h1", { className: styles.title, children: "\u25C6\u30CB\u30F3\u30B8\u30E3\u691C\u7D22\u91CD\u70B9\u25C6" }), _jsx("p", { className: styles.subtitle, children: "\u540D\u524D\u30FB\u5225\u540D\u30FB\u7D44\u7E54\u30FB\u767B\u5834\u90E8\u3067\u691C\u7D22\u3067\u304D\u307E\u3059" })] }), _jsxs("div", { className: styles.searchSection, children: [_jsx(SearchBar, { value: query, onChange: handleSearch }), _jsxs("button", { className: `${styles.filterToggle} ${filterOpen ? styles.filterToggleActive : ''} ${hasActiveFilter ? styles.filterToggleHasFilter : ''}`, onClick: handleFilterToggle, "aria-expanded": filterOpen, children: [_jsx("span", { className: styles.filterToggleIcon, children: filterOpen ? '▲' : '▼' }), "\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC", hasActiveFilter && _jsx("span", { className: styles.filterBadge, children: "ON" })] })] }), filterOpen && (_jsx("div", { className: styles.filterSection, children: _jsx(FilterPanel, { criteria: criteria, onChange: handleCriteriaChange, arcs: arcs, seasons: seasons, ninjaSouls: ninjaSouls, ninjaSoulClans: ninjaSoulClans, organizations: organizations }) })), isLoading && (_jsx("div", { className: styles.loading, children: "\u691C\u7D22\u4E2D..." })), !isLoading && isSearching && results.length === 0 && (_jsx("div", { className: styles.noResults, children: "\u6761\u4EF6\u306B\u5408\u3046\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F" })), !isLoading && results.length > 0 && (_jsxs("div", { className: styles.resultsSection, children: [_jsxs("p", { className: styles.resultCount, children: [_jsx("strong", { children: results.length }), " \u4EF6\u306E\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F"] }), _jsx("div", { className: styles.grid, children: results.map((ninja) => (_jsx(NinjaCard, { ninja: ninja, onClick: () => handleCardClick(ninja.id) }, ninja.id))) })] })), !isLoading && !isSearching && (_jsx("div", { className: styles.empty, children: _jsx("p", { children: "\u30CB\u30F3\u30B8\u30E3\u306E\u540D\u524D\u3092\u5165\u529B\u3059\u308B\u304B\u3001\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC\u3067\u7D5E\u308A\u8FBC\u3093\u3067\u304F\u3060\u3055\u3044" }) }))] }));
}
