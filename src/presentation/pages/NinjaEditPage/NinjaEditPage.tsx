import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ninja, NinjaType, NINJA_TYPES } from '../../../domain/entities/Ninja';
import { NinjaSoul, NinjaSoulGrade, NINJA_SOUL_GRADES } from '../../../domain/entities/NinjaSoul';
import { Episode } from '../../../domain/entities/Episode';
import { Organization } from '../../../domain/entities/Organization';
import { GetNinjaDetailUseCase } from '../../../usecases/GetNinjaDetailUseCase';
import { JsonNinjaRepository } from '../../../infrastructure/repositories/JsonNinjaRepository';
import { useNinjaEditContext } from '../../context/NinjaEditContext';
import styles from './NinjaEditPage.module.css';

// ---- ユーティリティ ----

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyEpisode(): Episode {
  return { id: genId(), title: '', arc: '', season: undefined };
}

function emptyOrg(): Organization {
  return { id: genId(), name: '' };
}

// ---- フォームの内部ステート型 ----
// Ninja型をそのまま使う。ninjaSoulのみ「持っているか」のフラグを別管理

interface FormState extends Ninja {
  _hasSoul: boolean;
}

function ninjaToForm(ninja: Ninja): FormState {
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

function formToNinja(form: FormState): Ninja {
  const { _hasSoul, ...ninjaFields } = form;
  return {
    ...ninjaFields,
    ninjaSoul: _hasSoul ? form.ninjaSoul : undefined,
    // 空文字のオプショナルフィールドを undefined に戻す
    realName: form.realName?.trim() || undefined,
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
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOverride, saveOverride, overrideCount, downloadNinjas } = useNinjaEditContext();

  const [form, setForm] = useState<FormState | null>(null);
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
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }, []);

  const setSoul = useCallback(<K extends keyof NinjaSoul>(key: K, value: NinjaSoul[K]) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, ninjaSoul: { ...(prev.ninjaSoul as NinjaSoul), [key]: value } };
    });
    setSaved(false);
  }, []);

  // 動的リスト操作
  const addAlias = () => set('aliases', [...(form?.aliases ?? []), '']);
  const removeAlias = (i: number) => set('aliases', (form?.aliases ?? []).filter((_, j) => j !== i));
  const updateAlias = (i: number, v: string) =>
    set('aliases', (form?.aliases ?? []).map((a, j) => j === i ? v : a));

  const addSkill = () => set('skills', [...(form?.skills ?? []), '']);
  const removeSkill = (i: number) => set('skills', (form?.skills ?? []).filter((_, j) => j !== i));
  const updateSkill = (i: number, v: string) =>
    set('skills', (form?.skills ?? []).map((s, j) => j === i ? v : s));

  const addOrg = () => set('organizations', [...(form?.organizations ?? []), emptyOrg()]);
  const removeOrg = (i: number) => set('organizations', (form?.organizations ?? []).filter((_, j) => j !== i));
  const updateOrg = (i: number, name: string) =>
    set('organizations', (form?.organizations ?? []).map((o, j) => j === i ? { ...o, name } : o));

  const addEpisode = () => set('appearances', [...(form?.appearances ?? []), emptyEpisode()]);
  const removeEpisode = (i: number) => set('appearances', (form?.appearances ?? []).filter((_, j) => j !== i));
  const updateEpisode = (i: number, patch: Partial<Episode>) =>
    set('appearances', (form?.appearances ?? []).map((e, j) => j === i ? { ...e, ...patch } : e));

  const handleSave = () => {
    if (!form) return;
    const ninja = formToNinja(form);
    saveOverride(ninja);
    setSaved(true);
    setTimeout(() => navigate(`/ninja/${ninja.id}`), 600);
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadNinjas();
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return <div className={styles.page}><div className={styles.loading}>読み込み中...</div></div>;
  }

  if (!form) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>ニンジャが見つかりません</p>
          <button onClick={() => navigate('/')} className={styles.btn}>トップに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* トップバー */}
      <div className={styles.topBar}>
        <button onClick={() => navigate(`/ninja/${id}`)} className={styles.btnSecondary}>
          ← キャンセル
        </button>
        <div className={styles.topActions}>
          <button
            onClick={handleDownloadAll}
            className={styles.btnDownload}
            disabled={downloading}
            title={`ninjas.json 全体をダウンロード（編集${overrideCount}件を反映）`}
          >
            {downloading ? '生成中...' : `📥 ninjas.json${overrideCount > 0 ? ` (${overrideCount}件編集済)` : ''}`}
          </button>
          <button onClick={handleSave} className={`${styles.btnPrimary} ${saved ? styles.btnSaved : ''}`}>
            {saved ? '✓ 保存済み' : '保存'}
          </button>
        </div>
      </div>

      <div className={styles.formContainer}>
        <h1 className={styles.pageTitle}>
          <span className={styles.pageTitleName}>{form.name}</span>
          <span className={styles.pageTitleSub}>を編集中</span>
        </h1>

        {/* ── 基本情報 ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>基本情報</legend>

          <div className={styles.fieldGrid}>
            <Field label="名前 *">
              <input
                className={styles.input}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="ニンジャ名"
              />
            </Field>

            <Field label="本名">
              <input
                className={styles.input}
                value={form.realName ?? ''}
                onChange={e => set('realName', e.target.value)}
                placeholder="本名（任意）"
              />
            </Field>

            <Field label="ステータス">
              <select
                className={styles.select}
                value={form.status ?? ''}
                onChange={e => set('status', (e.target.value as Ninja['status']) || undefined)}
              >
                <option value="">未設定</option>
                <option value="alive">生存</option>
                <option value="dead">死亡</option>
                <option value="unknown">不明</option>
              </select>
            </Field>

            <Field label="ニンジャタイプ">
              <select
                className={styles.select}
                value={form.ninjaType ?? ''}
                onChange={e => set('ninjaType', (e.target.value as NinjaType) || undefined)}
              >
                <option value="">未設定</option>
                {NINJA_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        {/* ── 別名 ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>別名</legend>
          <div className={styles.dynamicList}>
            {form.aliases?.map((alias, i) => (
              <div key={i} className={styles.listRow}>
                <input
                  className={styles.input}
                  value={alias}
                  onChange={e => updateAlias(i, e.target.value)}
                  placeholder={`別名 ${i + 1}`}
                />
                <button className={styles.btnRemove} onClick={() => removeAlias(i)} title="削除">✕</button>
              </div>
            ))}
            <button className={styles.btnAdd} onClick={addAlias}>＋ 別名を追加</button>
          </div>
        </fieldset>

        {/* ── ニンジャソウル ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>ニンジャソウル</legend>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={form._hasSoul}
              onChange={e => set('_hasSoul', e.target.checked)}
            />
            <span>ニンジャソウルを持つ</span>
          </label>

          {form._hasSoul && form.ninjaSoul && (
            <div className={styles.fieldGrid}>
              <Field label="ソウル名 *">
                <input
                  className={styles.input}
                  value={form.ninjaSoul.name}
                  onChange={e => setSoul('name', e.target.value)}
                  placeholder="例: ニンジャスレイヤー"
                />
              </Field>

              <Field label="等級">
                <select
                  className={styles.select}
                  value={form.ninjaSoul.grade ?? ''}
                  onChange={e => setSoul('grade', (e.target.value as NinjaSoulGrade) || undefined)}
                >
                  <option value="">未設定</option>
                  {NINJA_SOUL_GRADES.map(g => (
                    <option key={g} value={g}>{g}ニンジャ</option>
                  ))}
                </select>
              </Field>

              <Field label="クラン">
                <input
                  className={styles.input}
                  value={form.ninjaSoul.clan ?? ''}
                  onChange={e => setSoul('clan', e.target.value || undefined)}
                  placeholder="例: シノビ・ニンジャクラン"
                />
              </Field>

              <Field label="出自">
                <input
                  className={styles.input}
                  value={form.ninjaSoul.origin ?? ''}
                  onChange={e => setSoul('origin', e.target.value || undefined)}
                  placeholder="ソウルの来歴（任意）"
                />
              </Field>
            </div>
          )}
        </fieldset>

        {/* ── 所属組織 ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>所属組織</legend>
          <div className={styles.dynamicList}>
            {form.organizations?.map((org, i) => (
              <div key={org.id} className={styles.listRow}>
                <input
                  className={styles.input}
                  value={org.name}
                  onChange={e => updateOrg(i, e.target.value)}
                  placeholder={`組織名 ${i + 1}`}
                />
                <button className={styles.btnRemove} onClick={() => removeOrg(i)} title="削除">✕</button>
              </div>
            ))}
            <button className={styles.btnAdd} onClick={addOrg}>＋ 組織を追加</button>
          </div>
        </fieldset>

        {/* ── 登場エピソード ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>登場エピソード</legend>
          <div className={styles.episodeList}>
            {form.appearances?.map((ep, i) => (
              <div key={ep.id} className={styles.episodeEntry}>
                <div className={styles.episodeEntryHeader}>
                  <span className={styles.episodeIndex}>#{i + 1}</span>
                  <button className={styles.btnRemove} onClick={() => removeEpisode(i)} title="削除">✕</button>
                </div>
                <div className={styles.fieldGrid}>
                  <Field label="エピソードタイトル *">
                    <input
                      className={styles.input}
                      value={ep.title}
                      onChange={e => updateEpisode(i, { title: e.target.value })}
                      placeholder="エピソード名"
                    />
                  </Field>
                  <Field label="登場部">
                    <input
                      className={styles.input}
                      value={ep.arc ?? ''}
                      onChange={e => updateEpisode(i, { arc: e.target.value || undefined })}
                      placeholder="例: 第4部"
                    />
                  </Field>
                  <Field label="シーズン">
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={ep.season ?? ''}
                      onChange={e => updateEpisode(i, {
                        season: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="シーズン番号（第4部以降）"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <button className={styles.btnAdd} onClick={addEpisode}>＋ エピソードを追加</button>
          </div>
        </fieldset>

        {/* ── ジツ・カラテなど ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>ジツ・カラテなど</legend>
          <div className={styles.dynamicList}>
            {form.skills?.map((skill, i) => (
              <div key={i} className={styles.listRow}>
                <input
                  className={styles.input}
                  value={skill}
                  onChange={e => updateSkill(i, e.target.value)}
                  placeholder={`スキル ${i + 1}`}
                />
                <button className={styles.btnRemove} onClick={() => removeSkill(i)} title="削除">✕</button>
              </div>
            ))}
            <button className={styles.btnAdd} onClick={addSkill}>＋ スキルを追加</button>
          </div>
        </fieldset>

        {/* ── 説明 ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>説明</legend>
          <textarea
            className={styles.textarea}
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            rows={5}
            placeholder="キャラクターの説明・メモ（任意）"
          />
        </fieldset>

        {/* ── メタ情報 ── */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>メタ情報</legend>
          <div className={styles.fieldGrid}>
            <Field label="Wiki URL">
              <input
                className={styles.input}
                value={form.wikiUrl ?? ''}
                onChange={e => set('wikiUrl', e.target.value)}
                placeholder="https://wikiwiki.jp/njslyr/..."
                type="url"
              />
            </Field>
            <Field label="画像 URL">
              <input
                className={styles.input}
                value={form.imageUrl ?? ''}
                onChange={e => set('imageUrl', e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </Field>
            <Field label="ID（読み取り専用）">
              <input
                className={`${styles.input} ${styles.inputReadonly}`}
                value={form.id}
                readOnly
              />
            </Field>
          </div>
        </fieldset>

        {/* ── 保存ボタン（下部） ── */}
        <div className={styles.bottomActions}>
          <p className={styles.saveNote}>
            ※ 保存はセッション中のみ有効です。複数ニンジャを編集後、「📥 ninjas.json」ボタンで全体をダウンロードし、
            プロジェクトの <code>src/data/ninjas.json</code> に上書きしてください。
            {overrideCount > 0 && (
              <strong className={styles.saveNoteHighlight}> 現在 {overrideCount} 件の未保存編集があります。</strong>
            )}
          </p>
          <div className={styles.bottomButtons}>
            <button
              onClick={handleDownloadAll}
              className={styles.btnDownload}
              disabled={downloading}
            >
              {downloading ? '生成中...' : `📥 ninjas.json をダウンロード`}
            </button>
            <button onClick={handleSave} className={`${styles.btnPrimary} ${saved ? styles.btnSaved : ''}`}>
              {saved ? '✓ 保存済み' : '保存して詳細へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Field ラッパー ----
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}