import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
export function Layout({ children }) {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    return (_jsxs("div", { className: styles.wrapper, children: [_jsx("header", { className: styles.header, children: _jsxs("div", { className: styles.container, children: [_jsxs(Link, { to: "/", className: styles.logo, children: [_jsx("span", { className: styles.logoIcon, children: "\u26A1" }), _jsxs("span", { className: styles.logoText, children: ["SOUKAI", _jsx("span", { children: ".NET" })] })] }), _jsx("nav", { className: styles.nav, children: _jsx(Link, { to: "/", className: `${styles.navLink} ${isActive('/') ? styles.active : ''}`, children: "\u30CB\u30F3\u30B8\u30E3\u691C\u7D22" }) })] }) }), _jsx("main", { className: styles.main, children: _jsx("div", { className: styles.container, children: children }) }), _jsx("footer", { className: styles.footer, children: _jsx("div", { className: styles.container, children: _jsx("p", { className: styles.credit, children: "SOUKAI.NET - \u30CB\u30F3\u30B8\u30E3\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9" }) }) })] }));
}
