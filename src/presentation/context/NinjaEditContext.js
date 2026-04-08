import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';
const NinjaEditContext = createContext({
    getOverride: () => null,
    saveOverride: () => { },
    getAllOverrides: () => [],
    overrideCount: 0,
    downloadNinjas: async () => { },
});
export function NinjaEditProvider({ children }) {
    const [overrides, setOverrides] = useState(new Map());
    const getOverride = (id) => overrides.get(id) ?? null;
    const saveOverride = (ninja) => {
        setOverrides((prev) => {
            const next = new Map(prev);
            next.set(ninja.id, ninja);
            return next;
        });
    };
    const getAllOverrides = () => Array.from(overrides.values());
    const overrideCount = overrides.size;
    const downloadNinjas = async () => {
        const repo = new JsonNinjaRepository();
        const all = await repo.findAll();
        // in-memory の編集で元データを上書きマージ
        const merged = all.map((n) => overrides.get(n.id) ?? n);
        const json = JSON.stringify(merged, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ninjas.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    return (_jsx(NinjaEditContext.Provider, { value: { getOverride, saveOverride, getAllOverrides, overrideCount, downloadNinjas }, children: children }));
}
export function useNinjaEditContext() {
    return useContext(NinjaEditContext);
}
