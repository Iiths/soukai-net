export type Episode = {
  id: string;
  title: string;
  arc?: string;
  /** 登場シーズン（第4部以降のみ設定。第1〜3部は undefined） */
  season?: number;
};
