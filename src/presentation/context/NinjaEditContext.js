import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const NinjaEditContext = createContext({
    getOverride: () => null,
    saveOverride: () => { },
    getAllOverrides: () => [],
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
    return (_jsx(NinjaEditContext.Provider, { value: { getOverride, saveOverride, getAllOverrides }, children: children }));
}
export function useNinjaEditContext() {
    return useContext(NinjaEditContext);
}
