import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Episode } from '../../domain/entities/Episode';
import { JsonEpisodeRepository } from '../../infrastructure/repositories/JsonEpisodeRepository';

/**
 * エピソード編集コンテキスト
 *
 * NinjaEditContext と同じパターンで、セッション中の in-memory 編集データを管理する。
 * 編集画面（EpisodesEditPage）からのみ使用される。
 */
interface EpisodeEditContextValue {
  /** 指定IDの上書き済みデータを返す（未編集なら null） */
  getOverride: (id: string) => Episode | null;
  /** 上書き・新規追加をまとめて保存する */
  saveOverride: (episode: Episode) => void;
  /** 指定IDを削除マーク */
  markDeleted: (id: string) => void;
  /** 指定IDの削除マークを解除 */
  unmarkDeleted: (id: string) => void;
  /** 指定IDが削除マークされているか */
  isDeleted: (id: string) => boolean;
  /** 指定IDが更新されているか（override に存在するか） */
  isOverridden: (id: string) => boolean;
  /** 全 override データ（新規追加検出用） */
  getAllOverrides: () => Episode[];
  /** 編集件数（更新件数） */
  overrideCount: number;
  /** 削除マーク件数 */
  deletionCount: number;
  /** episodes.json 全体をマージしてダウンロードする */
  downloadEpisodes: () => Promise<void>;
}

const EpisodeEditContext = createContext<EpisodeEditContextValue>({
  getOverride: () => null,
  saveOverride: () => {},
  markDeleted: () => {},
  unmarkDeleted: () => {},
  isDeleted: () => false,
  isOverridden: () => false,
  getAllOverrides: () => [],
  overrideCount: 0,
  deletionCount: 0,
  downloadEpisodes: async () => {},
});

export function EpisodeEditProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, Episode>>(new Map());
  const [deletions, setDeletions] = useState<Set<string>>(new Set());

  const getOverride = useCallback(
    (id: string): Episode | null => overrides.get(id) ?? null,
    [overrides]
  );

  const saveOverride = useCallback((episode: Episode) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(episode.id, episode);
      return next;
    });
    // 更新されたので削除マークがあれば外す
    setDeletions((prev) => {
      if (!prev.has(episode.id)) return prev;
      const next = new Set(prev);
      next.delete(episode.id);
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
    (): Episode[] => Array.from(overrides.values()),
    [overrides]
  );

  const downloadEpisodes = useCallback(async () => {
    const repo = new JsonEpisodeRepository();
    const all = await repo.findAll();
    const existingIds = new Set(all.map((ep) => ep.id));

    // 1. 元データに override を適用し、削除マークを除外
    const merged: Episode[] = [];
    for (const ep of all) {
      if (deletions.has(ep.id)) continue;
      merged.push(overrides.get(ep.id) ?? ep);
    }

    // 2. 新規追加（元JSONに存在しないID）を末尾に追加（削除マーク除外）
    for (const ep of overrides.values()) {
      if (existingIds.has(ep.id)) continue;
      if (deletions.has(ep.id)) continue;
      merged.push(ep);
    }

    const json = JSON.stringify(merged, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'episodes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [overrides, deletions]);

  return (
    <EpisodeEditContext.Provider
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
        downloadEpisodes,
      }}
    >
      {children}
    </EpisodeEditContext.Provider>
  );
}

export function useEpisodeEditContext() {
  return useContext(EpisodeEditContext);
}
