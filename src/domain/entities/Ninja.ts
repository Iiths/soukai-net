import { NinjaSoul } from './NinjaSoul';
import { Organization } from './Organization';
import { Episode } from './Episode';

export type Ninja = {
  id: string;
  name: string;
  realName?: string;
  aliases?: string[];
  ninjaSoul?: NinjaSoul;
  organizations?: Organization[];
  appearances: Episode[];
  skills?: string[];
  description?: string;
  status?: 'alive' | 'dead' | 'unknown';
  imageUrl?: string;
  wikiUrl?: string;
};
