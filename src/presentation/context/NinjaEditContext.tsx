import { createContext, useContext, useState, ReactNode } from 'react';
import { Ninja } from '../../domain/entities/Ninja';

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
}

const NinjaEditContext = createContext<NinjaEditContextValue>({
  getOverride: () => null,
  saveOverride: () => {},
  getAllOverrides: () => [],
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

  return (
    <NinjaEditContext.Provider value={{ getOverride, saveOverride, getAllOverrides }}>
      {children}
    </NinjaEditContext.Provider>
  );
}

export function useNinjaEditContext() {
  return useContext(NinjaEditContext);
}
