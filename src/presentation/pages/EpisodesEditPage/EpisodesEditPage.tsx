import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Episode } from '../../../domain/entities/Episode';
import { JsonEpisodeRepository } from '../../../infrastructure/repositories/JsonEpisodeRepository';
import { useEpisodeEditContext } from '../../context/EpisodeEditContext';
import { useIsLocalDev } from '../../hooks/useIsLocalDev';
import styles from './EpisodesEditPage.module.css';

// ---- ユーティリティ ----

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

/** 部 (arc) の選択肢。空文字は「未設定」 */
const ARC_OPTIONS = ['', '第1部', '第2部', '第3部', '第4部', '外伝'] as const;

// ---- 行コンポーネント ----

type RowStatus = 'original' | 'modified' | 'deleted' | 'new-draft' | 'new-committed';

interface RowProps {
  episode: Episode;
  status: RowStatus;
  onUpdate: (next: Episode) => void;
  onDelete: () => void;
  onUndoDelete: () => void;
}

const EpisodeRow = memo(function EpisodeRow({
  episode,
  status,
  onUpdate,
  onDelete,
  onUndoDelete,
}: RowProps) {
  const [local, setLocal] = useState<Episode>(episode);
  const [justUpdated, setJustUpdated] = useState(false);

  // 親から渡される episode が変わったら local をリセット
  // （別のIDが表示される場合や、更新が外部要因で適用された場合に対応）
  useEffect(() => {
    setLocal(episode);
  }, [episode]);

  const setField = <K extends keyof Episode>(key: K, value: Episode[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setJustUpdated(false);
  };

  const handleUpdate = () => {
    // 空タイトルは弾く
    const title = (local.title ?? '').trim();
    if (!title) {
      alert('エピソード名を入力してください');
      return;
    }
    const next: Episode = {
      id: local.id,
      title,
    };
    if (local.arc && local.arc !== '') next.arc = local.arc;
    if (local.season !== undefined && !Number.isNaN(local.season)) {
      next.season = local.season;
    }
    onUpdate(next);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1500);
  };

  const isDeleted = status === 'deleted';

  const rowClass = [
    styles.row,
    isDeleted ? styles.rowDeleted : '',
    status === 'modified' ? styles.rowModified : '',
    status === 'new-draft' ? styles.rowNewDraft : '',
    status === 'new-committed' ? styles.rowNewCommitted : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClass}>
      <td className={styles.cellId}>
        <code className={styles.id}>{episode.id}</code>
        {status === 'modified' && <span className={styles.badgeModified}>更新済</span>}
        {status === 'new-draft' && <span className={styles.badgeNew}>新規（未保存）</span>}
        {status === 'new-committed' && <span className={styles.badgeNewCommitted}>新規</span>}
        {status === 'deleted' && <span className={styles.badgeDeleted}>削除予定</span>}
      </td>
      <td className={styles.cellTitle}>
        <input
          className={styles.input}
          value={local.title ?? ''}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="エピソード名"
          disabled={isDeleted}
        />
      </td>
      <td className={styles.cellArc}>
        <select
          className={styles.select}
          value={local.arc ?? ''}
          onChange={(e) => setField('arc', e.target.value ? e.target.value : undefined)}
          disabled={isDeleted}
        >
          {ARC_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || '未設定'}
            </option>
          ))}
        </select>
      </td>
      <td className={styles.cellSeason}>
        <input
          className={styles.inputSeason}
          type="number"
          min={1}
          value={local.season ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setField('season', v === '' ? undefined : Number(v));
          }}
          placeholder="—"
          disabled={isDeleted}
        />
      </td>
      <td className={styles.cellActions}>
        <button
          className={`${styles.btnUpdate} ${justUpdated ? styles.btnUpdateDone : ''}`}
          onClick={handleUpdate}
          disabled={isDeleted}
          title="この行の変更を保存"
        >
          {justUpdated ? '✓' : '更新'}
        </button>
        {isDeleted ? (
          <button
            className={styles.btnUndoDelete}
            onClick={onUndoDelete}
            title="削除を取り消す"
          >
            取消
          </button>
        ) : (
          <button className={styles.btnDelete} onClick={onDelete} title="削除">
            削除
          </button>
        )}
      </td>
    </tr>
  );
});

// ---- メインページ ----

export function EpisodesEditPage() {
  const navigate = useNavigate();
  const isLocalDev = useIsLocalDev();
  const {
    getOverride,
    saveOverride,
    markDeleted,
    unmarkDeleted,
    isDeleted,
    isOverridden,
    getAllOverrides,
    overrideCount,
    deletionCount,
    downloadEpisodes,
  } = useEpisodeEditContext();

  const [originalEpisodes, setOriginalEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  // 新規追加で作成したドラフト行（context には未コミット）
  const [newDrafts, setNewDrafts] = useState<Episode[]>([]);
  const [search, setSearch] = useState('');

  // ローカル開発でなければアクセス不可
  useEffect(() => {
    if (!isLocalDev) {
      navigate('/');
    }
  }, [isLocalDev, navigate]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const repo = new JsonEpisodeRepository();
        const all = await repo.findAll();
        setOriginalEpisodes(all);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // 元データに overrides を適用した表示用リスト
  const displayOriginal = useMemo<Episode[]>(() => {
    return originalEpisodes.map((ep) => getOverride(ep.id) ?? ep);
  }, [originalEpisodes, getOverride]);

  // 元データにないが overrides に存在する「コミット済み新規」
  const newCommitted = useMemo<Episode[]>(() => {
    const originalIds = new Set(originalEpisodes.map((ep) => ep.id));
    return getAllOverrides().filter((ep) => !originalIds.has(ep.id));
  }, [originalEpisodes, getAllOverrides]);

  // 検索フィルタリング
  const filteredDisplayOriginal = useMemo<Episode[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayOriginal;
    return displayOriginal.filter(
      (ep) =>
        ep.id.toLowerCase().includes(q) ||
        ep.title.toLowerCase().includes(q) ||
        (ep.arc ?? '').toLowerCase().includes(q)
    );
  }, [displayOriginal, search]);

  // 新規追加
  const handleAddNew = useCallback(() => {
    const newEp: Episode = {
      id: genId(),
      title: '',
    };
    setNewDrafts((prev) => [newEp, ...prev]);
  }, []);

  // ドラフト行の削除（context に未コミット → ローカルで削除）
  const removeDraft = useCallback((id: string) => {
    setNewDrafts((prev) => prev.filter((ep) => ep.id !== id));
  }, []);

  // ドラフト行の 更新 → context にコミットし、ローカルから除去
  const commitDraft = useCallback(
    (ep: Episode) => {
      saveOverride(ep);
      setNewDrafts((prev) => prev.filter((d) => d.id !== ep.id));
    },
    [saveOverride]
  );

  const handleDownload = useCallback(async () => {
    if (newDrafts.length > 0) {
      const ok = confirm(
        `未保存の新規追加が ${newDrafts.length} 件あります。\n` +
          `「更新」ボタンを押していない行はJSONに含まれません。\n` +
          `このまま保存しますか？`
      );
      if (!ok) return;
    }
    setDownloading(true);
    try {
      await downloadEpisodes();
    } finally {
      setDownloading(false);
    }
  }, [downloadEpisodes, newDrafts.length]);

  if (!isLocalDev) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  const totalDisplayed = newDrafts.length + filteredDisplayOriginal.length + newCommitted.length;

  const renderSaveBar = (position: 'top' | 'bottom') => (
    <div className={styles.saveBar}>
      <div className={styles.saveBarInfo}>
        <span>
          更新済: <strong>{overrideCount}</strong> 件 / 削除予定:{' '}
          <strong>{deletionCount}</strong> 件 / 未保存ドラフト:{' '}
          <strong>{newDrafts.length}</strong> 件
        </span>
      </div>
      <div className={styles.saveBarActions}>
        {position === 'top' && (
          <button className={styles.btnAddNew} onClick={handleAddNew}>
            ＋ 新規追加
          </button>
        )}
        <button
          className={styles.btnDownload}
          onClick={handleDownload}
          disabled={downloading}
          title="episodes.json をダウンロードする"
        >
          {downloading ? '生成中...' : '📥 episodes.json を保存'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={() => navigate('/')} className={styles.btnBack}>
          ← トップへ
        </button>
        <h1 className={styles.pageTitle}>エピソード編集</h1>
      </div>

      <p className={styles.note}>
        ※ 編集はセッション中のみ有効です。「更新」ボタンでその行の変更をメモリに保存し、
        「📥 episodes.json を保存」ボタンで <code>src/data/episodes.json</code> に上書き用のファイルをダウンロードしてください。
      </p>

      {renderSaveBar('top')}

      <div className={styles.searchBarWrapper}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ID / タイトル / 部 で絞り込み..."
        />
        <span className={styles.searchCount}>
          {search ? `${filteredDisplayOriginal.length} / ` : ''}
          {originalEpisodes.length} 件
          {totalDisplayed !== originalEpisodes.length && `（表示: ${totalDisplayed} 件）`}
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thId}>ID</th>
              <th className={styles.thTitle}>エピソード名</th>
              <th className={styles.thArc}>部</th>
              <th className={styles.thSeason}>シーズン</th>
              <th className={styles.thActions}>操作</th>
            </tr>
          </thead>
          <tbody>
            {/* 1. 新規ドラフト（未コミット） — 一番上 */}
            {newDrafts.map((ep) => (
              <EpisodeRow
                key={`draft-${ep.id}`}
                episode={ep}
                status="new-draft"
                onUpdate={commitDraft}
                onDelete={() => removeDraft(ep.id)}
                onUndoDelete={() => {}}
              />
            ))}

            {/* 2. コミット済み新規（元JSONに無いが overrides に存在） */}
            {newCommitted.map((ep) => {
              const deleted = isDeleted(ep.id);
              const status: RowStatus = deleted ? 'deleted' : 'new-committed';
              return (
                <EpisodeRow
                  key={`new-${ep.id}`}
                  episode={ep}
                  status={status}
                  onUpdate={saveOverride}
                  onDelete={() => markDeleted(ep.id)}
                  onUndoDelete={() => unmarkDeleted(ep.id)}
                />
              );
            })}

            {/* 3. 元データ + overrides */}
            {filteredDisplayOriginal.map((ep) => {
              const modified = isOverridden(ep.id);
              const deleted = isDeleted(ep.id);
              const status: RowStatus = deleted
                ? 'deleted'
                : modified
                ? 'modified'
                : 'original';
              return (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  status={status}
                  onUpdate={saveOverride}
                  onDelete={() => markDeleted(ep.id)}
                  onUndoDelete={() => unmarkDeleted(ep.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {renderSaveBar('bottom')}
    </div>
  );
}
