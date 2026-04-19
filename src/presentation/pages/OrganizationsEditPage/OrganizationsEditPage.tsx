import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Organization } from '../../../domain/entities/Organization';
import { JsonOrganizationRepository } from '../../../infrastructure/repositories/JsonOrganizationRepository';
import { useOrganizationEditContext } from '../../context/OrganizationEditContext';
import { useIsLocalDev } from '../../hooks/useIsLocalDev';
import styles from './OrganizationsEditPage.module.css';

// ---- ユーティリティ ----

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- 行コンポーネント ----

type RowStatus = 'original' | 'modified' | 'deleted' | 'new-draft' | 'new-committed';

interface RowProps {
  organization: Organization;
  status: RowStatus;
  onUpdate: (next: Organization) => void;
  onDelete: () => void;
  onUndoDelete: () => void;
}

const OrgRow = memo(function OrgRow({
  organization,
  status,
  onUpdate,
  onDelete,
  onUndoDelete,
}: RowProps) {
  const [local, setLocal] = useState<Organization>(organization);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    setLocal(organization);
  }, [organization]);

  const handleUpdate = () => {
    const name = (local.name ?? '').trim();
    if (!name) {
      alert('組織名を入力してください');
      return;
    }
    const next: Organization = { id: local.id, name };
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
        <code className={styles.id}>{organization.id}</code>
        {status === 'modified' && <span className={styles.badgeModified}>更新済</span>}
        {status === 'new-draft' && <span className={styles.badgeNew}>新規（未保存）</span>}
        {status === 'new-committed' && <span className={styles.badgeNewCommitted}>新規</span>}
        {status === 'deleted' && <span className={styles.badgeDeleted}>削除予定</span>}
      </td>
      <td className={styles.cellName}>
        <input
          className={styles.input}
          value={local.name ?? ''}
          onChange={(e) => {
            setLocal({ ...local, name: e.target.value });
            setJustUpdated(false);
          }}
          placeholder="組織名"
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

export function OrganizationsEditPage() {
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
    downloadOrganizations,
  } = useOrganizationEditContext();

  const [originalOrgs, setOriginalOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [newDrafts, setNewDrafts] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isLocalDev) {
      navigate('/');
    }
  }, [isLocalDev, navigate]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const repo = new JsonOrganizationRepository();
        const all = await repo.findAll();
        setOriginalOrgs(all);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const displayOriginal = useMemo<Organization[]>(() => {
    return originalOrgs.map((org) => getOverride(org.id) ?? org);
  }, [originalOrgs, getOverride]);

  const newCommitted = useMemo<Organization[]>(() => {
    const originalIds = new Set(originalOrgs.map((o) => o.id));
    return getAllOverrides().filter((o) => !originalIds.has(o.id));
  }, [originalOrgs, getAllOverrides]);

  const filteredDisplayOriginal = useMemo<Organization[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayOriginal;
    return displayOriginal.filter(
      (o) => o.id.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
    );
  }, [displayOriginal, search]);

  const handleAddNew = useCallback(() => {
    const newOrg: Organization = { id: genId(), name: '' };
    setNewDrafts((prev) => [newOrg, ...prev]);
  }, []);

  const removeDraft = useCallback((id: string) => {
    setNewDrafts((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const commitDraft = useCallback(
    (org: Organization) => {
      saveOverride(org);
      setNewDrafts((prev) => prev.filter((d) => d.id !== org.id));
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
      await downloadOrganizations();
    } finally {
      setDownloading(false);
    }
  }, [downloadOrganizations, newDrafts.length]);

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
          title="organizations.json をダウンロードする"
        >
          {downloading ? '生成中...' : '📥 organizations.json を保存'}
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
        <h1 className={styles.pageTitle}>組織編集</h1>
      </div>

      <p className={styles.note}>
        ※ 編集はセッション中のみ有効です。「更新」ボタンでその行の変更をメモリに保存し、
        「📥 organizations.json を保存」ボタンで <code>src/data/organizations.json</code> に上書き用のファイルをダウンロードしてください。
      </p>

      {renderSaveBar('top')}

      <div className={styles.searchBarWrapper}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ID / 組織名 で絞り込み..."
        />
        <span className={styles.searchCount}>
          {search ? `${filteredDisplayOriginal.length} / ` : ''}
          {originalOrgs.length} 件
          {totalDisplayed !== originalOrgs.length && `（表示: ${totalDisplayed} 件）`}
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thId}>ID</th>
              <th className={styles.thName}>組織名</th>
              <th className={styles.thActions}>操作</th>
            </tr>
          </thead>
          <tbody>
            {newDrafts.map((org) => (
              <OrgRow
                key={`draft-${org.id}`}
                organization={org}
                status="new-draft"
                onUpdate={commitDraft}
                onDelete={() => removeDraft(org.id)}
                onUndoDelete={() => {}}
              />
            ))}

            {newCommitted.map((org) => {
              const deleted = isDeleted(org.id);
              const status: RowStatus = deleted ? 'deleted' : 'new-committed';
              return (
                <OrgRow
                  key={`new-${org.id}`}
                  organization={org}
                  status={status}
                  onUpdate={saveOverride}
                  onDelete={() => markDeleted(org.id)}
                  onUndoDelete={() => unmarkDeleted(org.id)}
                />
              );
            })}

            {filteredDisplayOriginal.map((org) => {
              const modified = isOverridden(org.id);
              const deleted = isDeleted(org.id);
              const status: RowStatus = deleted
                ? 'deleted'
                : modified
                ? 'modified'
                : 'original';
              return (
                <OrgRow
                  key={org.id}
                  organization={org}
                  status={status}
                  onUpdate={saveOverride}
                  onDelete={() => markDeleted(org.id)}
                  onUndoDelete={() => unmarkDeleted(org.id)}
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
