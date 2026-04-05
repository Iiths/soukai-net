import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterNinjaUseCase } from '../../../usecases/FilterNinjaUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { FilterPanel } from '../../components/FilterPanel/FilterPanel';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import styles from './AdvancedSearchPage.module.css';
export function AdvancedSearchPage() {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState({});
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [allNinjas, setAllNinjas] = useState([]);
    const arcs = useMemo(() => {
        const arcSet = new Set();
        allNinjas.forEach((ninja) => {
            ninja.appearances.forEach((app) => {
                if (app.arc)
                    arcSet.add(app.arc);
            });
        });
        return Array.from(arcSet).sort();
    }, [allNinjas]);
    const ninjaSouls = useMemo(() => {
        const soulSet = new Set();
        allNinjas.forEach((ninja) => {
            if (ninja.ninjaSoul)
                soulSet.add(ninja.ninjaSoul.name);
        });
        return Array.from(soulSet).sort();
    }, [allNinjas]);
    const organizations = useMemo(() => {
        const orgSet = new Set();
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
            }
            finally {
                setIsLoading(false);
            }
        };
        performFilter();
    }, [criteria]);
    const handleCardClick = (id) => {
        navigate(`/ninja/${id}`);
    };
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.header, children: [_jsx("h1", { className: styles.title, children: "\u8A73\u7D30\u691C\u7D22" }), _jsx("p", { className: styles.subtitle, children: "\u8907\u6570\u306E\u6761\u4EF6\u3067\u30CB\u30F3\u30B8\u30E3\u3092\u7D5E\u308A\u8FBC\u307F\u307E\u3059" })] }), _jsx(FilterPanel, { criteria: criteria, onChange: setCriteria, arcs: arcs, ninjaSouls: ninjaSouls, organizations: organizations }), isLoading && (_jsx("div", { className: styles.loading, children: "\u30D5\u30A3\u30EB\u30BF\u4E2D..." })), !isLoading && results.length === 0 && (_jsx("div", { className: styles.noResults, children: "\u6761\u4EF6\u306B\u5408\u3046\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" })), !isLoading && results.length > 0 && (_jsxs("div", { className: styles.resultsSection, children: [_jsxs("h2", { className: styles.resultCount, children: [results.length, "\u4EF6\u306E\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F"] }), _jsx("div", { className: styles.grid, children: results.map((ninja) => (_jsx(NinjaCard, { ninja: ninja, onClick: () => handleCardClick(ninja.id) }, ninja.id))) })] }))] }));
}
