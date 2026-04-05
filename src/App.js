import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './presentation/components/Layout/Layout';
import { SimpleSearchPage } from './presentation/pages/SimpleSearchPage/SimpleSearchPage';
import { AdvancedSearchPage } from './presentation/pages/AdvancedSearchPage/AdvancedSearchPage';
import { NinjaDetailPage } from './presentation/pages/NinjaDetailPage/NinjaDetailPage';
function App() {
    return (_jsx(BrowserRouter, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SimpleSearchPage, {}) }), _jsx(Route, { path: "/search", element: _jsx(AdvancedSearchPage, {}) }), _jsx(Route, { path: "/ninja/:id", element: _jsx(NinjaDetailPage, {}) })] }) }) }));
}
export default App;
