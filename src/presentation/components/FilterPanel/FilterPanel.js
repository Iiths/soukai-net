import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './FilterPanel.module.css';
export function FilterPanel({ criteria, onChange, arcs, ninjaSouls, organizations, }) {
    const handleArcChange = (arc) => {
        onChange({ ...criteria, arc: arc === '' ? undefined : arc });
    };
    const handleSoulChange = (soul) => {
        onChange({
            ...criteria,
            ninjaSoulName: soul === '' ? undefined : soul,
        });
    };
    const handleOrgChange = (org) => {
        onChange({
            ...criteria,
            organizationName: org === '' ? undefined : org,
        });
    };
    const handleStatusChange = (status) => {
        onChange({
            ...criteria,
            status: status === '' ? undefined : status,
        });
    };
    return (_jsxs("div", { className: styles.panel, children: [_jsxs("div", { className: styles.filterGroup, children: [_jsx("label", { className: styles.label, children: "\u767B\u5834\u90E8" }), _jsxs("select", { className: styles.select, value: criteria.arc || '', onChange: (e) => handleArcChange(e.target.value), children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), arcs.map((arc) => (_jsx("option", { value: arc, children: arc }, arc)))] })] }), _jsxs("div", { className: styles.filterGroup, children: [_jsx("label", { className: styles.label, children: "\u30CB\u30F3\u30B8\u30E3\u30BD\u30A6\u30EB" }), _jsxs("select", { className: styles.select, value: criteria.ninjaSoulName || '', onChange: (e) => handleSoulChange(e.target.value), children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), ninjaSouls.map((soul) => (_jsx("option", { value: soul, children: soul }, soul)))] })] }), _jsxs("div", { className: styles.filterGroup, children: [_jsx("label", { className: styles.label, children: "\u6240\u5C5E\u7D44\u7E54" }), _jsxs("select", { className: styles.select, value: criteria.organizationName || '', onChange: (e) => handleOrgChange(e.target.value), children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), organizations.map((org) => (_jsx("option", { value: org, children: org }, org)))] })] }), _jsxs("div", { className: styles.filterGroup, children: [_jsx("label", { className: styles.label, children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs("select", { className: styles.select, value: criteria.status || '', onChange: (e) => handleStatusChange(e.target.value), children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), _jsx("option", { value: "alive", children: "\u751F\u5B58" }), _jsx("option", { value: "dead", children: "\u6B7B\u4EA1" }), _jsx("option", { value: "unknown", children: "\u4E0D\u660E" })] })] })] }));
}
