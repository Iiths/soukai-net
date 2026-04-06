import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { SearchNinjaUseCase } from '../../../usecases/SearchNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import styles from './SimpleSearchPage.module.css';
export function SimpleSearchPage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [criteria, setCriteria] = useState({});
    const [results, setResults] = useState([]);
    const [allNinjas, setAllNinjas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    // 全ニンジャ一覧を初回ロード
    useEffect(() => {
        const repo = new JsonNinjaRepository();
        repo.findAll().then(setAllNinjas);
    }, []);
    // フィルターパネル用の選択肢を動的に生成
    const arcs = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => n.appearances.forEach((a) => { if (a.arc)
            s.add(a.arc); }));
        return Array.from(s).sort();
    }, [allNinjas]);
    const seasons = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => n.appearances.forEach((a) => { if (a.season !== undefined)
            s.add(a.season); }));
        return Array.from(s).sort((a, b) => a - b);
    }, [allNinjas]);
    const ninjaSouls = useMemo(() => {
        const s = new Set();
        allNinjas.forEach((n) => { if (n.ninjaSoul)
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
    // 名前検索 + 詳細フィルターを組み合わせた検索
    const performSearch = useCallback(async (q, c) => {
        setIsLoading(true);
        try {
            const repo = new JsonNinjaRepository();
            let base;
            if (q.trim()) {
                // 名前・別名で絞り込み
                const searchUseCase = new SearchNinjaUseCase(repo);
                base = await searchUseCase.execute(q);
            }
            else {
                base = await repo.findAll();
            }
            // さらに詳細フィルターを適用（criteria が空なら全件通過）
            const hasFilter = Object.values(c).some((v) => v !== undefined && v !== '');
            if (hasFilter) {
                const filterUseCase = new FilterNinjaUseCase({ findAll: async () => base, findById: async (id) => base.find((n) => n.id === id) ?? null });
                base = await filterUseCase.execute(c);
            }
            setResults(base);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const handleSearch = (q) => {
        setQuery(q);
        performSearch(q, criteria);
    };
    const handleCriteriaChange = (c) => {
        setCriteria(c);
        performSearch(query, c);
    };
    const handleCardClick = (id) => {
        navigate(`/ninja/${id}`);
    };
    const hasActiveFilter = Object.values(criteria).some((v) => v !== undefined && v !== '');
    const isSearching = query.trim() || hasActiveFilter;
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.header, children: [_jsxs("h1", { className: styles.title, children: [_jsx("span", { className: styles.titleAccent, children: "\u5FCD" }), " NINJA DATABASE"] }), _jsx("p", { className: styles.subtitle, children: "\u540D\u524D\u30FB\u5225\u540D\u30FB\u7D44\u7E54\u30FB\u767B\u5834\u90E8\u3067\u691C\u7D22\u3067\u304D\u307E\u3059" })] }), _jsxs("div", { className: styles.searchSection, children: [_jsx(SearchBar, { value: query, onChange: handleSearch }), _jsxs("button", { className: `${styles.filterToggle} ${filterOpen ? styles.filterToggleActive : ''} ${hasActiveFilter ? styles.filterToggleHasFilter : ''}`, onClick: () => setFilterOpen((v) => !v), "aria-expanded": filterOpen, children: [_jsx("span", { className: styles.filterToggleIcon, children: filterOpen ? '▲' : '▼' }), "\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC", hasActiveFilter && _jsx("span", { className: styles.filterBadge, children: "ON" })] })] }), filterOpen && (_jsx("div", { className: styles.filterSection, children: _jsx(FilterPanel, { criteria: criteria, onChange: handleCriteriaChange, arcs: arcs, seasons: seasons, ninjaSouls: ninjaSouls, ninjaSoulClans: ninjaSoulClans, organizations: organizations }) })), isLoading && (_jsx("div", { className: styles.loading, children: "\u691C\u7D22\u4E2D..." })), !isLoading && isSearching && results.length === 0 && (_jsx("div", { className: styles.noResults, children: "\u6761\u4EF6\u306B\u5408\u3046\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F" })), !isLoading && results.length > 0 && (_jsxs("div", { className: styles.resultsSection, children: [_jsxs("p", { className: styles.resultCount, children: [_jsx("strong", { children: results.length }), " \u4EF6\u306E\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F"] }), _jsx("div", { className: styles.grid, children: results.map((ninja) => (_jsx(NinjaCard, { ninja: ninja, onClick: () => handleCardClick(ninja.id) }, ninja.id))) })] })), !isLoading && !isSearching && (_jsx("div", { className: styles.empty, children: _jsx("p", { children: "\u30CB\u30F3\u30B8\u30E3\u306E\u540D\u524D\u3092\u5165\u529B\u3059\u308B\u304B\u3001\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC\u3067\u7D5E\u308A\u8FBC\u3093\u3067\u304F\u3060\u3055\u3044" }) }))] }));
}
