import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useNinjaDetail } from '../../hooks/useNinjaDetail';
import { Badge } from '../../components/Badge/Badge';
import styles from './NinjaDetailPage.module.css';
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
/** 値がある（null/undefined/''/[]でない）かを判定 */
function hasValue(v) {
    if (v === null || v === undefined)
        return false;
    if (typeof v === 'string')
        return v.trim().length > 0;
    if (Array.isArray(v))
        return v.length > 0;
    return true;
}
/** 未登録の場合に表示するプレースホルダー */
function Empty({ label }) {
    return (_jsxs("span", { className: styles.emptyValue, children: [label, "\uFF08\u672A\u767B\u9332\uFF09"] }));
}
/** <br /> タグを React の改行要素に変換して表示 */
function WithLineBreaks({ text }) {
    const parts = text.split(/<br\s*\/?>/gi);
    return (_jsx(_Fragment, { children: parts.map((part, i) => (_jsxs("span", { children: [part, i < parts.length - 1 && _jsx("br", {})] }, i))) }));
}
export function NinjaDetailPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { ninja, episodes, isLoading } = useNinjaDetail(id);
    if (isLoading) {
        return (_jsx("div", { className: styles.page, children: _jsx("div", { className: styles.loading, children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." }) }));
    }
    if (!ninja) {
        return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.notFound, children: [_jsx("h2", { children: "\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }), _jsx("button", { onClick: () => navigate('/'), className: styles.backButton, children: "\u30C8\u30C3\u30D7\u306B\u623B\u308B" })] }) }));
    }
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.topBar, children: [_jsx("button", { onClick: () => navigate(-1), className: styles.backButton, children: "\u2190 \u623B\u308B" }), _jsx("button", { onClick: () => navigate(`/ninja/${ninja.id}/edit`), className: styles.editButton, children: "\u7DE8\u96C6" })] }), _jsxs("div", { className: styles.container, children: [_jsxs("div", { className: styles.header, children: [_jsxs("div", { className: styles.nameRow, children: [_jsx("h1", { className: styles.name, children: ninja.name }), hasValue(ninja.status) && (_jsx("span", { className: `${styles.statusBadge} ${STATUS_CLASS[ninja.status] ?? ''}`, children: STATUS_LABEL[ninja.status] ?? ninja.status }))] }), hasValue(ninja.realName) && (_jsxs("p", { className: styles.realName, children: ["\u672C\u540D: ", ninja.realName] }))] }), _jsxs("div", { className: styles.infoGrid, children: [hasValue(ninja.aliases) && (_jsxs("div", { className: styles.infoItem, children: [_jsx("div", { className: styles.infoLabel, children: "\u5225\u540D" }), _jsx("div", { className: styles.infoValue, children: _jsx("div", { className: styles.tagRow, children: ninja.aliases.map((alias, i) => (_jsx("span", { className: styles.aliasTag, children: alias }, i))) }) })] })), _jsxs("div", { className: styles.infoItem, children: [_jsx("div", { className: styles.infoLabel, children: "\u30CB\u30F3\u30B8\u30E3\u30BF\u30A4\u30D7" }), _jsx("div", { className: styles.infoValue, children: hasValue(ninja.ninjaType)
                                            ? _jsx("span", { className: styles.ninjaTypeTag, children: ninja.ninjaType })
                                            : _jsx(Empty, { label: "\u30BF\u30A4\u30D7" }) })] }), hasValue(ninja.role) && (_jsxs("div", { className: styles.infoItem, children: [_jsx("div", { className: styles.infoLabel, children: "\u5F79\u8077" }), _jsx("div", { className: styles.infoValue, children: _jsx("span", { className: styles.roleTag, children: ninja.role }) })] }))] }), hasValue(ninja.appearance) && (_jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u5916\u898B" }), _jsx("p", { className: styles.appearanceText, children: _jsx(WithLineBreaks, { text: ninja.appearance }) })] })), ninja.ninjaSoul && (_jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u30CB\u30F3\u30B8\u30E3\u30BD\u30A6\u30EB" }), _jsxs("div", { className: styles.soulCard, children: [_jsxs("div", { className: styles.soulHeader, children: [_jsx(Badge, { variant: "soul", text: ninja.ninjaSoul.name }), hasValue(ninja.ninjaSoul.grade) && (_jsxs("span", { className: styles.soulGrade, children: [ninja.ninjaSoul.grade, "\u30CB\u30F3\u30B8\u30E3"] }))] }), _jsxs("dl", { className: styles.soulDetail, children: [hasValue(ninja.ninjaSoul.clan) && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "\u30AF\u30E9\u30F3" }), _jsx("dd", { children: ninja.ninjaSoul.clan })] })), hasValue(ninja.ninjaSoul.origin) && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "\u51FA\u81EA" }), _jsx("dd", { children: ninja.ninjaSoul.origin })] }))] })] })] })), _jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u6240\u5C5E\u7D44\u7E54" }), hasValue(ninja.organizations) ? (_jsx("div", { className: styles.tagRow, children: ninja.organizations.map((org) => (_jsx(Badge, { variant: "org", text: org.name }, org.id))) })) : _jsx(Empty, { label: "\u6240\u5C5E\u7D44\u7E54" })] }), _jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u30B8\u30C4\u30FB\u30AB\u30E9\u30C6\u306A\u3069" }), hasValue(ninja.skills) ? (_jsx("ul", { className: styles.skillList, children: ninja.skills.map((skill, i) => (_jsx("li", { children: skill }, i))) })) : _jsx(Empty, { label: "\u30B9\u30AD\u30EB" })] }), _jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u767B\u5834\u30A8\u30D4\u30BD\u30FC\u30C9" }), episodes.length > 0 ? (_jsx("div", { className: styles.episodeGrid, children: episodes.map((ep) => (_jsxs("div", { className: styles.episodeCard, children: [_jsx("div", { className: styles.epTitle, children: ep.title }), _jsxs("div", { className: styles.epMeta, children: [hasValue(ep.arc) && _jsx(Badge, { variant: "arc", text: ep.arc }), ep.season !== undefined && (_jsxs("span", { className: styles.epSeason, children: ["S", ep.season] }))] })] }, ep.id))) })) : _jsx(Empty, { label: "\u30A8\u30D4\u30BD\u30FC\u30C9" })] }), _jsxs("section", { className: styles.section, children: [_jsx("h2", { className: styles.sectionTitle, children: "\u8AAC\u660E" }), hasValue(ninja.description)
                                ? _jsx("p", { className: styles.description, children: _jsx(WithLineBreaks, { text: ninja.description }) })
                                : _jsx(Empty, { label: "\u8AAC\u660E" })] }), _jsxs("div", { className: styles.metaFooter, children: [_jsxs("div", { className: styles.metaRow, children: [_jsx("span", { className: styles.metaLabel, children: "ID" }), _jsx("code", { className: styles.metaCode, children: ninja.id })] }), hasValue(ninja.imageUrl) && (_jsxs("div", { className: styles.metaRow, children: [_jsx("span", { className: styles.metaLabel, children: "\u753B\u50CFURL" }), _jsx("code", { className: styles.metaCode, children: ninja.imageUrl })] })), hasValue(ninja.wikiUrl) && (_jsxs("div", { className: styles.metaRow, children: [_jsx("span", { className: styles.metaLabel, children: "Wiki" }), _jsx("a", { href: ninja.wikiUrl, target: "_blank", rel: "noopener noreferrer", className: styles.wikiLink, children: ninja.wikiUrl })] }))] })] })] }));
}
