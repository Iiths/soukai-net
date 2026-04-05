import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './SearchBar.module.css';
export function SearchBar({ value, onChange, placeholder = 'ニンジャの名前を検索...', }) {
    return (_jsxs("div", { className: styles.container, children: [_jsx("input", { type: "text", className: styles.input, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder }), _jsx("div", { className: styles.icon, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }) })] }));
}
