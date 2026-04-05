import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useNinjaSearch } from '../../hooks/useNinjaSearch';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import styles from './SimpleSearchPage.module.css';
export function SimpleSearchPage() {
    const navigate = useNavigate();
    const { query, results, isLoading, search } = useNinjaSearch();
    const handleCardClick = (id) => {
        navigate(`/ninja/${id}`);
    };
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.header, children: [_jsx("h1", { className: styles.title, children: "\u30CB\u30F3\u30B8\u30E3\u3092\u691C\u7D22" }), _jsx("p", { className: styles.subtitle, children: "\u540D\u524D\u307E\u305F\u306F\u30CB\u30F3\u30B8\u30E3\u30BD\u30A6\u30EB\u540D\u3067\u691C\u7D22\u3057\u307E\u3059" })] }), _jsx("div", { className: styles.searchSection, children: _jsx(SearchBar, { value: query, onChange: search }) }), isLoading && (_jsx("div", { className: styles.loading, children: "\u691C\u7D22\u4E2D..." })), !isLoading && query && results.length === 0 && (_jsxs("div", { className: styles.noResults, children: ["\u300C", query, "\u300D\u306E\u691C\u7D22\u7D50\u679C\u306F\u3042\u308A\u307E\u305B\u3093"] })), !isLoading && results.length > 0 && (_jsxs("div", { className: styles.resultsSection, children: [_jsxs("h2", { className: styles.resultCount, children: [results.length, "\u4EF6\u306E\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F"] }), _jsx("div", { className: styles.grid, children: results.map((ninja) => (_jsx(NinjaCard, { ninja: ninja, onClick: () => handleCardClick(ninja.id) }, ninja.id))) })] })), !isLoading && !query && (_jsx("div", { className: styles.empty, children: _jsx("p", { children: "\u30CB\u30F3\u30B8\u30E3\u306E\u540D\u524D\u3092\u5165\u529B\u3057\u3066\u691C\u7D22\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044" }) }))] }));
}
