/** episodes.json に保存される完全なエピソードエンティティ */
export type Episode = {
  id: string;
  title: string;
  arc?: string;
  /** 登場シーズン（第4部以降のみ設定。第1〜3部は undefined） */
  season?: number;
};

/** ninjas.json の appearances に保存されるエピソード参照（IDのみ） */
export type EpisodeRef = {
  id: string;
};
