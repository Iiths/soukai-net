import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
import { NinjaEditPage } from './presentation/pages/NinjaEditPage/NinjaEditPage';
import { NinjaEditProvider } from './presentation/context/NinjaEditContext';
function App() {
    return (_jsx(BrowserRouter, { children: _jsx(NinjaEditProvider, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SimpleSearchPage, {}) }), _jsx(Route, { path: "/search", element: _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/ninja/:id", element: _jsx(NinjaDetailPage, {}) }), _jsx(Route, { path: "/ninja/:id/edit", element: _jsx(NinjaEditPage, {}) })] }) }) }) }));
}
export default App;
