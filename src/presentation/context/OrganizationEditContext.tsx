import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Organization } from '../../domain/entities/Organization';
import { JsonOrganizationRepository } from '../../infrastructure/repositories/JsonOrganizationRepository';

/**
 * 組織編集コンテキスト
 *
 * NinjaEditContext と同じパターンで、セッション中の in-memory 編集データを管理する。
 * 編集画面（OrganizationsEditPage）からのみ使用される。
 */
interface OrganizationEditContextValue {
  /** 指定IDの上書き済みデータを返す（未編集なら null） */
  getOverride: (id: string) => Organization | null;
  /** 上書き・新規追加をまとめて保存する */
  saveOverride: (organization: Organization) => void;
  /** 指定IDを削除マーク */
  markDeleted: (id: string) => void;
  /** 指定IDの削除マークを解除 */
  unmarkDeleted: (id: string) => void;
  /** 指定IDが削除マークされているか */
  isDeleted: (id: string) => boolean;
  /** 指定IDが更新されているか（override に存在するか） */
  isOverridden: (id: string) => boolean;
  /** 全 override データ（新規追加検出用） */
  getAllOverrides: () => Organization[];
  /** 編集件数（更新件数） */
  overrideCount: number;
  /** 削除マーク件数 */
  deletionCount: number;
  /** organizations.json 全体をマージしてダウンロードする */
  downloadOrganizations: () => Promise<void>;
}

const OrganizationEditContext = createContext<OrganizationEditContextValue>({
  getOverride: () => null,
  saveOverride: () => {},
  markDeleted: () => {},
  unmarkDeleted: () => {},
  isDeleted: () => false,
  isOverridden: () => false,
  getAllOverrides: () => [],
  overrideCount: 0,
  deletionCount: 0,
  downloadOrganizations: async () => {},
});

export function OrganizationEditProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, Organization>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const getOverride = useCallback(
    (id: string): Organization | null => overrides.get(id) ?? null,
    [overrides]
  );

  const saveOverride = useCallback((organization: Organization) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(organization.id, organization);
      return next;
    });
    setDeletions((prev) => {
      if (!prev.has(organization.id)) return prev;
      const next = new Set(prev);
      next.delete(organization.id);
      return next;
    });
  }, []);

  const markDeleted = useCallback((id: string) => {
    setDeletions((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unmarkDeleted = useCallback((id: string) => {
    setDeletions((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isDeleted = useCallback(
    (id: string): boolean => deletions.has(id),
    [deletions]
  );

  const isOverridden = useCallback(
    (id: string): boolean => overrides.has(id),
    [overrides]
  );

  const getAllOverrides = useCallback(
    (): Organization[] => Array.from(overrides.values()),
    [overrides]
  );

  const downloadOrganizations = useCallback(async () => {
    const repo = new JsonOrganizationRepository();
    const all = await repo.findAll();
    const existingIds = new Set(all.map((o) => o.id));

    const merged: Organization[] = [];
    for (const org of all) {
      if (deletions.has(org.id)) continue;
      merged.push(overrides.get(org.id) ?? org);
    }

    for (const org of overrides.values()) {
      if (existingIds.has(org.id)) continue;
      if (deletions.has(org.id)) continue;
      merged.push(org);
    }

    const json = JSON.stringify(merged, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [overrides, deletions]);

  return (
    <OrganizationEditContext.Provider
      value={{
        getOverride,
        saveOverride,
        markDeleted,
        unmarkDeleted,
        isDeleted,
        isOverridden,
        getAllOverrides,
        overrideCount: overrides.size,
        deletionCount: deletions.size,
        downloadOrganizations,
      }}
    >
      {children}
    </OrganizationEditContext.Provider>
  );
}

export function useOrganizationEditContext() {
  return useContext(OrganizationEditContext);
}
