export type NinjaSoulGrade =
  | 'アーチ級'
  | 'グレーター級'
  | 'レッサー級'
  | '等級不明'
  | '等級なし';

export const NINJA_SOUL_GRADES: NinjaSoulGrade[] = [
  'アーチ級',
  'グレーター級',
  'レッサー級',
  '等級不明',
  '等級なし',
];

export type NinjaSoul = {
  id: string;
  name: string;
  origin?: string;
  /** ニンジャソウルの等級（アーチ級/グレーター級/レッサー級/等級不明/等級なし） */
  grade?: NinjaSoulGrade;
  /** 所属ニンジャクラン（例: "シノビ・ニンジャクラン"） */
  clan?: string;
};
