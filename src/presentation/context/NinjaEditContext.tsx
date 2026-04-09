import { createContext, useContext, useState, ReactNode } from 'react';
import { Ninja } from '../../domain/entities/Ninja';
import { JsonNinjaRepository } from '../../infrastructure/repositories/JsonNinjaRepository';

/**
 * ニンジャ編集コンテキスト
 *
 * セッション中の in-memory 編集データを管理する。
 * 将来的にバックエンドAPIが実装された際は saveOverride の実装を
 * API呼び出しに置き換えることで、UI側の変更なしに永続化が可能になる。
 */
interface NinjaEditContextValue {
  /** 指定IDの編集済みデータを返す（未編集なら null） */
  getOverride: (id: string) => Ninja | null;
  /** 編集済みデータをメモリに保存する */
  saveOverride: (ninja: Ninja) => void;
  /** 全編集済みデータ（デバッグ用・JSON出力用） */
  getAllOverrides: () => Ninja[];
  /** 現在の編集件数 */
  overrideCount: number;
  /**
   * ninjas.json 全体を編集マージしてダウンロードする。
   * 元データに in-memory の編集を上書きし、ninjas.json としてブラウザに保存する。
   */
  downloadNinjas: () => Promise<void>;
}

const NinjaEditContext = createContext<NinjaEditContextValue>({
  getOverride: () => null,
  saveOverride: () => {},
  getAllOverrides: () => [],
  overrideCount: 0,
  downloadNinjas: async () => {},
});

export function NinjaEditProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, Ninja>>(new Map());

  const getOverride = (id: string): Ninja | null =>
    overrides.get(id) ?? null;

  const saveOverride = (ninja: Ninja) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(ninja.id, ninja);
      return next;
    });
  };

  const getAllOverrides = (): Ninja[] => Array.from(overrides.values());

  const overrideCount = overrides.size;

  const downloadNinjas = async () => {
    const repo = new JsonNinjaRepository();
    const all = await repo.findAll();
    // in-memory の編集で元データを上書きマージ
    const existingIds = new Set(all.map((n) => n.id));
    const merged = all.map((n) => overrides.get(n.id) ?? n);
    // 新規追加ニンジャ（元 JSON に存在しない ID）を末尾に追加
    const brandNew = Array.from(overrides.values()).filter((n) => !existingIds.has(n.id));
    const final = [...merged, ...brandNew];
    const json = JSON.stringify(final, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ninjas.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // ダウンロード後に編集件数はリセットしない（ユーザーが上書き保存後もアプリを使い続けられるように）
  };

  return (
    <NinjaEditContext.Provider value={{ getOverride, saveOverride, getAllOverrides, overrideCount, downloadNinjas }}>
      {children}
    </NinjaEditContext.Provider>
  );
}

export function useNinjaEditContext() {
  return useContext(NinjaEditContext);
}
