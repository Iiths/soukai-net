import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './NinjaCard.module.css';
import { Badge } from '../Badge/Badge';
const STATUS_LABEL = {
    alive: '生存',
    dead: '死亡',
    unknown: '不明',
};
const STATUS_CLASS = {
    alive: styles.statusAlive,
    dead: styles.statusDead,
    unknown: styles.statusUnknown,
};
export function NinjaCard({ ninja, onClick }) {
    return (_jsxs("div", { className: styles.card, onClick: onClick, role: "button", tabIndex: 0, children: [_jsxs("div", { className: styles.header, children: [_jsx("h2", { className: styles.name, children: ninja.name }), ninja.status && (_jsx("span", { className: `${styles.statusBadge} ${STATUS_CLASS[ninja.status] ?? ''}`, children: STATUS_LABEL[ninja.status] ?? ninja.status }))] }), ninja.realName && (_jsx("p", { className: styles.realName, children: ninja.realName })), ninja.aliases && ninja.aliases.length > 0 && (_jsxs("div", { className: styles.aliases, children: [_jsx("span", { className: styles.label, children: "\u5225\u540D:" }), ninja.aliases.map((alias, idx) => (_jsx("span", { className: styles.alias, children: alias }, idx)))] })), ninja.ninjaSoul && ninja.ninjaSoul.name && (_jsx("div", { className: styles.soul, children: _jsx(Badge, { variant: "soul", text: ninja.ninjaSoul.name }) })), ninja.organizations && ninja.organizations.length > 0 && (_jsx("div", { className: styles.organizations, children: ninja.organizations.map((org) => (_jsx(Badge, { variant: "org", text: org.name }, org.id))) })), ninja.description && (_jsx("p", { className: styles.description, children: ninja.description }))] }));
}
