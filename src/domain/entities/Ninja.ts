import { NinjaSoul } from './NinjaSoul';
import { Organization } from './Organization';
import { Episode } from './Episode';

export type NinjaType =
  | 'ニンジャソウル憑依者'
  | 'リアルニンジャ'
  | 'ロボ・ニンジャ'
  | 'バイオニンジャ'
  | '非ニンジャ';

export const NINJA_TYPES: NinjaType[] = [
  'ニンジャソウル憑依者',
  'リアルニンジャ',
  'ロボ・ニンジャ',
  'バイオニンジャ',
  '非ニンジャ',
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
  appearances: Episode[];
  skills?: string[];
  description?: string;
  status?: 'alive' | 'dead' | 'unknown';
  imageUrl?: string;
  wikiUrl?: string;
};
