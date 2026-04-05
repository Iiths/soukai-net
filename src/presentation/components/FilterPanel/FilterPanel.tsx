import { FilterCriteria } from '../../../usecases/FilterNinjaUseCase';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  arcs: string[];
  ninjaSouls: string[];
  organizations: string[];
}

export function FilterPanel({
  criteria,
  onChange,
  arcs,
  ninjaSouls,
  organizations,
}: FilterPanelProps) {
  const handleArcChange = (arc: string) => {
    onChange({ ...criteria, arc: arc === '' ? undefined : arc });
  };

  const handleSoulChange = (soul: string) => {
    onChange({
      ...criteria,
      ninjaSoulName: soul === '' ? undefined : soul,
    });
  };

  const handleOrgChange = (org: string) => {
    onChange({
      ...criteria,
      organizationName: org === '' ? undefined : org,
    });
  };

  const handleStatusChange = (
    status: 'alive' | 'dead' | 'unknown' | ''
  ) => {
    onChange({
      ...criteria,
      status: status === '' ? undefined : (status as any),
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.filterGroup}>
        <label className={styles.label}>登場部</label>
        <select
          className={styles.select}
          value={criteria.arc || ''}
          onChange={(e) => handleArcChange(e.target.value)}
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
        <label className={styles.label}>ニンジャソウル</label>
        <select
          className={styles.select}
          value={criteria.ninjaSoulName || ''}
          onChange={(e) => handleSoulChange(e.target.value)}
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
        <label className={styles.label}>所属組織</label>
        <select
          className={styles.select}
          value={criteria.organizationName || ''}
          onChange={(e) => handleOrgChange(e.target.value)}
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
            handleStatusChange(
              e.target.value as 'alive' | 'dead' | 'unknown' | ''
            )
          }
        >
          <option value="">すべて</option>
          <option value="alive">生存</option>
          <option value="dead">死亡</option>
          <option value="unknown">不明</option>
        </select>
      </div>
    </div>
  );
}
