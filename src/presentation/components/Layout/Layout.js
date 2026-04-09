import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNinjaEditContext } from '../../context/NinjaEditContext';
import { useIsLocalDev } from '../../hooks/useIsLocalDev';
import styles from './Layout.module.css';
export function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isLocalDev = useIsLocalDev();
    const { downloadNinjas, overrideCount } = useNinjaEditContext();
    const isActive = (path) => location.pathname === path;
    return (_jsxs("div", { className: styles.wrapper, children: [_jsx("header", { className: styles.header, children: _jsxs("div", { className: styles.container, children: [_jsxs(Link, { to: "/", className: styles.logo, children: [_jsx("img", { src: "/soukai-icon.png", alt: "", className: styles.logoIcon }), _jsxs("span", { className: styles.logoText, children: ["SOUKAI", _jsx("span", { children: ".NET" })] })] }), _jsxs("nav", { className: styles.nav, children: [_jsx(Link, { to: "/", className: `${styles.navLink} ${isActive('/') ? styles.active : ''}`, children: "\u30CB\u30F3\u30B8\u30E3\u691C\u7D22" }), isLocalDev && (_jsx("button", { className: styles.navButton, onClick: () => navigate('/ninja/new/edit'), title: "\u65B0\u3057\u3044\u30CB\u30F3\u30B8\u30E3\u3092\u8FFD\u52A0\u3059\u308B", children: "\uFF0B \u65B0\u898F\u8FFD\u52A0" })), isLocalDev && (_jsxs("button", { className: `${styles.navButton} ${styles.navButtonSave}`, onClick: downloadNinjas, title: `ninjas.json をダウンロード（編集 ${overrideCount} 件反映）`, children: ["\uD83D\uDCE5 ninjas.json \u4FDD\u5B58", overrideCount > 0 && (_jsx("span", { className: styles.navBadge, children: overrideCount }))] }))] })] }) }), _jsx("main", { className: styles.main, children: _jsx("div", { className: styles.container, children: children }) }), _jsx("footer", { className: styles.footer, children: _jsx("div", { className: styles.container, children: _jsx("p", { className: styles.credit, children: "SOUKAI.NET - \u30CB\u30F3\u30B8\u30E3\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9" }) }) })] }));
}
