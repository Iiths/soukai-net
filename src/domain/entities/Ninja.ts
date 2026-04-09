import { NinjaSoul } from './NinjaSoul';
import { Organization } from './Organization';
import { EpisodeRef } from './Episode';

export type NinjaType =
  | 'ニンジャソウル憑依者'
  | 'リアルニンジャ'
  | 'ロボ・ニンジャ'
  | 'バイオニンジャ'
  | '非ニンジャ'
  | 'カツ・ワンソーの影';

export const NINJA_TYPES: NinjaType[] = [
  'ニンジャソウル憑依者',
  'リアルニンジャ',
  'ロボ・ニンジャ',
  'バイオニンジャ',
  '非ニンジャ',
  'カツ・ワンソーの影',
];

export type Ninja = {
  id: string;
  name: string;
  realName?: string;
  aliases?: string[];
  /** ニンジャの種別（ニンジャソウル憑依者/リアルニンジャ/ロボ・ニンジャ/バイオニンジャ/非ニンジャ） */
  ninjaType?: NinjaType;
  ninjaSoul?: NinjaSoul;
  organizations?: Organization[];
  /** 登場エピソード参照（IDのみ。詳細は episodes.json を参照） */
  appearances: EpisodeRef[];
  skills?: string[];
  /** 役職・肩書き（例: ドン、幹部、アンダーボス） */
  role?: string;
  /** 外見の描写（髪色・体格・服装など） */
  appearance?: string;
  description?: string;
  status?: 'alive' | 'dead' | 'unknown';
  imageUrl?: string;
  wikiUrl?: string;
};
