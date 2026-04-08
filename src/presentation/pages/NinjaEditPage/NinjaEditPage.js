import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NINJA_TYPES } from '../../../domain/entities/Ninja';
import { NINJA_SOUL_GRADES } from '../../../domain/entities/NinjaSoul';
import { GetNinjaDetailUseCase } from '../../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { useNinjaEditContext } from '../../context/NinjaEditContext';
import styles from './NinjaEditPage.module.css';
// ---- ユーティリティ ----
function genId() {
    return Math.random().toString(36).slice(2, 10);
}
function emptyEpisode() {
    return { id: genId(), title: '', arc: '', season: undefined };
}
function emptyOrg() {
    return { id: genId(), name: '' };
}
function ninjaToForm(ninja) {
    return {
        ...ninja,
        aliases: ninja.aliases ?? [],
        skills: ninja.skills ?? [],
        organizations: ninja.organizations ?? [],
        appearances: ninja.appearances ?? [],
        ninjaSoul: ninja.ninjaSoul ?? {
            id: genId(),
            name: '',
            grade: undefined,
            clan: '',
            origin: '',
        },
        _hasSoul: !!ninja.ninjaSoul,
    };
}
function formToNinja(form) {
    const { _hasSoul, ...ninjaFields } = form;
    return {
        ...ninjaFields,
        ninjaSoul: _hasSoul ? form.ninjaSoul : undefined,
        // 空文字のオプショナルフィールドを undefined に戻す
        realName: form.realName?.trim() || undefined,
        role: form.role?.trim() || undefined,
        appearance: form.appearance?.trim() || undefined,
        description: form.description?.trim() || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
        wikiUrl: form.wikiUrl?.trim() || undefined,
        aliases: form.aliases?.filter(a => a.trim()) ?? [],
        skills: form.skills?.filter(s => s.trim()) ?? [],
        organizations: form.organizations?.filter(o => o.name.trim()) ?? [],
        appearances: form.appearances?.filter(e => e.title.trim()) ?? [],
    };
}
// ---- メインコンポーネント ----
export function NinjaEditPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const { getOverride, saveOverride, overrideCount, downloadNinjas } = useNinjaEditContext();
    const [form, setForm] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [downloading, setDownloading] = useState(false);
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const override = getOverride(id);
                if (override) {
                    setForm(ninjaToForm(override));
                    return;
                }
                const repo = new JsonNinjaRepository();
                const useCase = new GetNinjaDetailUseCase(repo);
                const ninja = await useCase.execute(id);
                setForm(ninja ? ninjaToForm(ninja) : null);
            }
            finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);
    const set = useCallback((key, value) => {
        setForm(prev => prev ? { ...prev, [key]: value } : prev);
        setSaved(false);
    }, []);
    const setSoul = useCallback((key, value) => {
        setForm(prev => {
            if (!prev)
                return prev;
            return { ...prev, ninjaSoul: { ...prev.ninjaSoul, [key]: value } };
        });
        setSaved(false);
    }, []);
    // 動的リスト操作
    const addAlias = () => set('aliases', [...(form?.aliases ?? []), '']);
    const removeAlias = (i) => set('aliases', (form?.aliases ?? []).filter((_, j) => j !== i));
    const updateAlias = (i, v) => set('aliases', (form?.aliases ?? []).map((a, j) => j === i ? v : a));
    const addSkill = () => set('skills', [...(form?.skills ?? []), '']);
    const removeSkill = (i) => set('skills', (form?.skills ?? []).filter((_, j) => j !== i));
    const updateSkill = (i, v) => set('skills', (form?.skills ?? []).map((s, j) => j === i ? v : s));
    const addOrg = () => set('organizations', [...(form?.organizations ?? []), emptyOrg()]);
    const removeOrg = (i) => set('organizations', (form?.organizations ?? []).filter((_, j) => j !== i));
    const updateOrg = (i, name) => set('organizations', (form?.organizations ?? []).map((o, j) => j === i ? { ...o, name } : o));
    const addEpisode = () => set('appearances', [...(form?.appearances ?? []), emptyEpisode()]);
    const removeEpisode = (i) => set('appearances', (form?.appearances ?? []).filter((_, j) => j !== i));
    const updateEpisode = (i, patch) => set('appearances', (form?.appearances ?? []).map((e, j) => j === i ? { ...e, ...patch } : e));
    const handleSave = () => {
        if (!form)
            return;
        const ninja = formToNinja(form);
        saveOverride(ninja);
        setSaved(true);
        setTimeout(() => navigate(`/ninja/${ninja.id}`), 600);
    };
    const handleDownloadAll = async () => {
        setDownloading(true);
        try {
            await downloadNinjas();
        }
        finally {
            setDownloading(false);
        }
    };
    if (isLoading) {
        return _jsx("div", { className: styles.page, children: _jsx("div", { className: styles.loading, children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." }) });
    }
    if (!form) {
        return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.notFound, children: [_jsx("p", { children: "\u30CB\u30F3\u30B8\u30E3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" }), _jsx("button", { onClick: () => navigate('/'), className: styles.btn, children: "\u30C8\u30C3\u30D7\u306B\u623B\u308B" })] }) }));
    }
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.topBar, children: [_jsx("button", { onClick: () => navigate(`/ninja/${id}`), className: styles.btnSecondary, children: "\u2190 \u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsxs("div", { className: styles.topActions, children: [_jsx("button", { onClick: handleDownloadAll, className: styles.btnDownload, disabled: downloading, title: `ninjas.json 全体をダウンロード（編集${overrideCount}件を反映）`, children: downloading ? '生成中...' : `📥 ninjas.json${overrideCount > 0 ? ` (${overrideCount}件編集済)` : ''}` }), _jsx("button", { onClick: handleSave, className: `${styles.btnPrimary} ${saved ? styles.btnSaved : ''}`, children: saved ? '✓ 保存済み' : '保存' })] })] }), _jsxs("div", { className: styles.formContainer, children: [_jsxs("h1", { className: styles.pageTitle, children: [_jsx("span", { className: styles.pageTitleName, children: form.name }), _jsx("span", { className: styles.pageTitleSub, children: "\u3092\u7DE8\u96C6\u4E2D" })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u57FA\u672C\u60C5\u5831" }), _jsxs("div", { className: styles.fieldGrid, children: [_jsx(Field, { label: "\u540D\u524D *", children: _jsx("input", { className: styles.input, value: form.name, onChange: e => set('name', e.target.value), placeholder: "\u30CB\u30F3\u30B8\u30E3\u540D" }) }), _jsx(Field, { label: "\u672C\u540D", children: _jsx("input", { className: styles.input, value: form.realName ?? '', onChange: e => set('realName', e.target.value), placeholder: "\u672C\u540D\uFF08\u4EFB\u610F\uFF09" }) }), _jsx(Field, { label: "\u30B9\u30C6\u30FC\u30BF\u30B9", children: _jsxs("select", { className: styles.select, value: form.status ?? '', onChange: e => set('status', e.target.value || undefined), children: [_jsx("option", { value: "", children: "\u672A\u8A2D\u5B9A" }), _jsx("option", { value: "alive", children: "\u751F\u5B58" }), _jsx("option", { value: "dead", children: "\u6B7B\u4EA1" }), _jsx("option", { value: "unknown", children: "\u4E0D\u660E" })] }) }), _jsx(Field, { label: "\u30CB\u30F3\u30B8\u30E3\u30BF\u30A4\u30D7", children: _jsxs("select", { className: styles.select, value: form.ninjaType ?? '', onChange: e => set('ninjaType', e.target.value || undefined), children: [_jsx("option", { value: "", children: "\u672A\u8A2D\u5B9A" }), NINJA_TYPES.map(t => (_jsx("option", { value: t, children: t }, t)))] }) })] })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u5225\u540D" }), _jsxs("div", { className: styles.dynamicList, children: [form.aliases?.map((alias, i) => (_jsxs("div", { className: styles.listRow, children: [_jsx("input", { className: styles.input, value: alias, onChange: e => updateAlias(i, e.target.value), placeholder: `別名 ${i + 1}` }), _jsx("button", { className: styles.btnRemove, onClick: () => removeAlias(i), title: "\u524A\u9664", children: "\u2715" })] }, i))), _jsx("button", { className: styles.btnAdd, onClick: addAlias, children: "\uFF0B \u5225\u540D\u3092\u8FFD\u52A0" })] })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u30CB\u30F3\u30B8\u30E3\u30BD\u30A6\u30EB" }), _jsxs("label", { className: styles.toggle, children: [_jsx("input", { type: "checkbox", checked: form._hasSoul, onChange: e => set('_hasSoul', e.target.checked) }), _jsx("span", { children: "\u30CB\u30F3\u30B8\u30E3\u30BD\u30A6\u30EB\u3092\u6301\u3064" })] }), form._hasSoul && form.ninjaSoul && (_jsxs("div", { className: styles.fieldGrid, children: [_jsx(Field, { label: "\u30BD\u30A6\u30EB\u540D *", children: _jsx("input", { className: styles.input, value: form.ninjaSoul.name, onChange: e => setSoul('name', e.target.value), placeholder: "\u4F8B: \u30CB\u30F3\u30B8\u30E3\u30B9\u30EC\u30A4\u30E4\u30FC" }) }), _jsx(Field, { label: "\u7B49\u7D1A", children: _jsxs("select", { className: styles.select, value: form.ninjaSoul.grade ?? '', onChange: e => setSoul('grade', e.target.value || undefined), children: [_jsx("option", { value: "", children: "\u672A\u8A2D\u5B9A" }), NINJA_SOUL_GRADES.map(g => (_jsxs("option", { value: g, children: [g, "\u30CB\u30F3\u30B8\u30E3"] }, g)))] }) }), _jsx(Field, { label: "\u30AF\u30E9\u30F3", children: _jsx("input", { className: styles.input, value: form.ninjaSoul.clan ?? '', onChange: e => setSoul('clan', e.target.value || undefined), placeholder: "\u4F8B: \u30B7\u30CE\u30D3\u30FB\u30CB\u30F3\u30B8\u30E3\u30AF\u30E9\u30F3" }) }), _jsx(Field, { label: "\u51FA\u81EA", children: _jsx("input", { className: styles.input, value: form.ninjaSoul.origin ?? '', onChange: e => setSoul('origin', e.target.value || undefined), placeholder: "\u30BD\u30A6\u30EB\u306E\u6765\u6B74\uFF08\u4EFB\u610F\uFF09" }) })] }))] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u6240\u5C5E\u7D44\u7E54" }), _jsxs("div", { className: styles.dynamicList, children: [form.organizations?.map((org, i) => (_jsxs("div", { className: styles.listRow, children: [_jsx("input", { className: styles.input, value: org.name, onChange: e => updateOrg(i, e.target.value), placeholder: `組織名 ${i + 1}` }), _jsx("button", { className: styles.btnRemove, onClick: () => removeOrg(i), title: "\u524A\u9664", children: "\u2715" })] }, org.id))), _jsx("button", { className: styles.btnAdd, onClick: addOrg, children: "\uFF0B \u7D44\u7E54\u3092\u8FFD\u52A0" })] })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u767B\u5834\u30A8\u30D4\u30BD\u30FC\u30C9" }), _jsxs("div", { className: styles.episodeList, children: [form.appearances?.map((ep, i) => (_jsxs("div", { className: styles.episodeEntry, children: [_jsxs("div", { className: styles.episodeEntryHeader, children: [_jsxs("span", { className: styles.episodeIndex, children: ["#", i + 1] }), _jsx("button", { className: styles.btnRemove, onClick: () => removeEpisode(i), title: "\u524A\u9664", children: "\u2715" })] }), _jsxs("div", { className: styles.fieldGrid, children: [_jsx(Field, { label: "\u30A8\u30D4\u30BD\u30FC\u30C9\u30BF\u30A4\u30C8\u30EB *", children: _jsx("input", { className: styles.input, value: ep.title, onChange: e => updateEpisode(i, { title: e.target.value }), placeholder: "\u30A8\u30D4\u30BD\u30FC\u30C9\u540D" }) }), _jsx(Field, { label: "\u767B\u5834\u90E8", children: _jsx("input", { className: styles.input, value: ep.arc ?? '', onChange: e => updateEpisode(i, { arc: e.target.value || undefined }), placeholder: "\u4F8B: \u7B2C4\u90E8" }) }), _jsx(Field, { label: "\u30B7\u30FC\u30BA\u30F3", children: _jsx("input", { className: styles.input, type: "number", min: 1, value: ep.season ?? '', onChange: e => updateEpisode(i, {
                                                                season: e.target.value ? Number(e.target.value) : undefined
                                                            }), placeholder: "\u30B7\u30FC\u30BA\u30F3\u756A\u53F7\uFF08\u7B2C4\u90E8\u4EE5\u964D\uFF09" }) })] })] }, ep.id))), _jsx("button", { className: styles.btnAdd, onClick: addEpisode, children: "\uFF0B \u30A8\u30D4\u30BD\u30FC\u30C9\u3092\u8FFD\u52A0" })] })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u30B8\u30C4\u30FB\u30AB\u30E9\u30C6\u306A\u3069" }), _jsxs("div", { className: styles.dynamicList, children: [form.skills?.map((skill, i) => (_jsxs("div", { className: styles.listRow, children: [_jsx("input", { className: styles.input, value: skill, onChange: e => updateSkill(i, e.target.value), placeholder: `スキル ${i + 1}` }), _jsx("button", { className: styles.btnRemove, onClick: () => removeSkill(i), title: "\u524A\u9664", children: "\u2715" })] }, i))), _jsx("button", { className: styles.btnAdd, onClick: addSkill, children: "\uFF0B \u30B9\u30AD\u30EB\u3092\u8FFD\u52A0" })] })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u5F79\u8077\u30FB\u5916\u898B" }), _jsx("div", { className: styles.fieldGrid, children: _jsx(Field, { label: "\u5F79\u8077", children: _jsx("input", { className: styles.input, value: form.role ?? '', onChange: e => set('role', e.target.value), placeholder: "\u4F8B: \u30C9\u30F3\u3001\u5E79\u90E8\u3001\u30A2\u30F3\u30C0\u30FC\u30DC\u30B9\uFF08\u4EFB\u610F\uFF09" }) }) }), _jsx(Field, { label: "\u5916\u898B", children: _jsx("textarea", { className: styles.textarea, value: form.appearance ?? '', onChange: e => set('appearance', e.target.value), rows: 3, placeholder: "\u9AEA\u8272\u30FB\u4F53\u683C\u30FB\u670D\u88C5\u306A\u3069\u5916\u898B\u306E\u63CF\u5199\uFF08\u4EFB\u610F\uFF09" }) })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u8AAC\u660E" }), _jsx("textarea", { className: styles.textarea, value: form.description ?? '', onChange: e => set('description', e.target.value), rows: 5, placeholder: "\u30AD\u30E3\u30E9\u30AF\u30BF\u30FC\u306E\u8AAC\u660E\u30FB\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09" })] }), _jsxs("fieldset", { className: styles.fieldset, children: [_jsx("legend", { className: styles.legend, children: "\u30E1\u30BF\u60C5\u5831" }), _jsxs("div", { className: styles.fieldGrid, children: [_jsx(Field, { label: "Wiki URL", children: _jsx("input", { className: styles.input, value: form.wikiUrl ?? '', onChange: e => set('wikiUrl', e.target.value), placeholder: "https://wikiwiki.jp/njslyr/...", type: "url" }) }), _jsx(Field, { label: "\u753B\u50CF URL", children: _jsx("input", { className: styles.input, value: form.imageUrl ?? '', onChange: e => set('imageUrl', e.target.value), placeholder: "https://...", type: "url" }) }), _jsx(Field, { label: "ID\uFF08\u8AAD\u307F\u53D6\u308A\u5C02\u7528\uFF09", children: _jsx("input", { className: `${styles.input} ${styles.inputReadonly}`, value: form.id, readOnly: true }) })] })] }), _jsxs("div", { className: styles.bottomActions, children: [_jsxs("p", { className: styles.saveNote, children: ["\u203B \u4FDD\u5B58\u306F\u30BB\u30C3\u30B7\u30E7\u30F3\u4E2D\u306E\u307F\u6709\u52B9\u3067\u3059\u3002\u8907\u6570\u30CB\u30F3\u30B8\u30E3\u3092\u7DE8\u96C6\u5F8C\u3001\u300C\uD83D\uDCE5 ninjas.json\u300D\u30DC\u30BF\u30F3\u3067\u5168\u4F53\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3001 \u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E ", _jsx("code", { children: "src/data/ninjas.json" }), " \u306B\u4E0A\u66F8\u304D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", overrideCount > 0 && (_jsxs("strong", { className: styles.saveNoteHighlight, children: [" \u73FE\u5728 ", overrideCount, " \u4EF6\u306E\u672A\u4FDD\u5B58\u7DE8\u96C6\u304C\u3042\u308A\u307E\u3059\u3002"] }))] }), _jsxs("div", { className: styles.bottomButtons, children: [_jsx("button", { onClick: handleDownloadAll, className: styles.btnDownload, disabled: downloading, children: downloading ? '生成中...' : `📥 ninjas.json をダウンロード` }), _jsx("button", { onClick: handleSave, className: `${styles.btnPrimary} ${saved ? styles.btnSaved : ''}`, children: saved ? '✓ 保存済み' : '保存して詳細へ' })] })] })] })] }));
}
// ---- Field ラッパー ----
function Field({ label, children }) {
    return (_jsxs("div", { className: styles.field, children: [_jsx("label", { className: styles.fieldLabel, children: label }), children] }));
}
