import { FilterCriteria } from '../../../usecases/FilterNinjaUseCase';
import { NinjaType } from '../../../domain/entities/Ninja';
import { NinjaSoulGrade } from '../../../domain/entities/NinjaSoul';
import styles from './FilterPanel.module.css';

const NINJA_TYPES: NinjaType[] = [
  'ニンジャソウル憑依者',
  'リアルニンジャ',
  'ロボ・ニンジャ',
  'バイオニンジャ',
  '非ニンジャ',
];

const NINJA_SOUL_GRADES: NinjaSoulGrade[] = [
  'アーチ級',
  'グレーター級',
  'レッサー級',
  '等級不明',
  '等級なし',
];

interface FilterPanelProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  arcs: string[];
  seasons: number[];
  ninjaSouls: string[];
  ninjaSoulClans: string[];
  organizations: string[];
}

export function FilterPanel({
  criteria,
  onChange,
  arcs,
  seasons,
  ninjaSouls,
  ninjaSoulClans,
  organizations,
}: FilterPanelProps) {
  const set = <K extends keyof FilterCriteria>(
    key: K,
    value: FilterCriteria[K] | ''
  ) => {
    onChange({ ...criteria, [key]: value === '' ? undefined : value });
  };

  return (
    <div className={styles.panel}>
      {/* 登場情報 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>登場情報</div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>登場部</label>
            <select
              className={styles.select}
              value={criteria.arc || ''}
              onChange={(e) => set('arc', e.target.value)}
            >
              <option value="">すべて</option>
              {arcs.map((arc) => (
                <option key={arc} value={arc}>
                  {arc}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>登場シーズン</label>
            <select
              className={styles.select}
              value={criteria.season !== undefined ? String(criteria.season) : ''}
              onChange={(e) =>
                set('season', e.target.value === '' ? '' : Number(e.target.value) as any)
              }
            >
              <option value="">すべて</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  シーズン{s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>エピソード</label>
            <input
              className={styles.input}
              type="text"
              placeholder="エピソード名で検索"
              value={criteria.episodeTitle || ''}
              onChange={(e) => set('episodeTitle', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ニンジャ種別 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>ニンジャ種別</div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>ニンジャタイプ</label>
            <select
              className={styles.select}
              value={criteria.ninjaType || ''}
              onChange={(e) => set('ninjaType', e.target.value as NinjaType | '')}
            >
              <option value="">すべて</option>
              {NINJA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ニンジャソウル */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>ニンジャソウル</div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>ニンジャソウル名</label>
            <select
              className={styles.select}
              value={criteria.ninjaSoulName || ''}
              onChange={(e) => set('ninjaSoulName', e.target.value)}
            >
              <option value="">すべて</option>
              {ninjaSouls.map((soul) => (
                <option key={soul} value={soul}>
                  {soul}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>ソウル等級</label>
            <select
              className={styles.select}
              value={criteria.ninjaSoulGrade || ''}
              onChange={(e) =>
                set('ninjaSoulGrade', e.target.value as NinjaSoulGrade | '')
              }
            >
              <option value="">すべて</option>
              {NINJA_SOUL_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}ニンジャ
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>ニンジャクラン</label>
            <select
              className={styles.select}
              value={criteria.ninjaSoulClan || ''}
              onChange={(e) => set('ninjaSoulClan', e.target.value)}
            >
              <option value="">すべて</option>
              {ninjaSoulClans.map((clan) => (
                <option key={clan} value={clan}>
                  {clan}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* その他 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>その他</div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>所属組織</label>
            <select
              className={styles.select}
              value={criteria.organizationName || ''}
              onChange={(e) => set('organizationName', e.target.value)}
            >
              <option value="">すべて</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>ステータス</label>
            <select
              className={styles.select}
              value={criteria.status || ''}
              onChange={(e) =>
                set('status', e.target.value as 'alive' | 'dead' | 'unknown' | '')
              }
            >
              <option value="">すべて</option>
              <option value="alive">生存</option>
              <option value="dead">死亡</option>
              <option value="unknown">不明</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
