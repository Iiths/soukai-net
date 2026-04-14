import { Ninja } from '../../../domain/entities/Ninja';
import { Organization } from '../../../domain/entities/Organization';
import styles from './NinjaCard.module.css';
import { Badge } from '../Badge/Badge';

interface NinjaCardProps {
  ninja: Ninja;
  onClick?: () => void;
  /** 組織名解決用マップ（id → Organization）。省略時は組織バッジを非表示 */
  orgMap?: Map<string, Organization>;
}

const STATUS_LABEL: Record<string, string> = {
  alive: '生存',
  dead: '死亡',
  unknown: '不明',
};

const STATUS_CLASS: Record<string, string> = {
  alive: styles.statusAlive,
  dead: styles.statusDead,
  unknown: styles.statusUnknown,
};

export function NinjaCard({ ninja, onClick, orgMap }: NinjaCardProps) {
  const resolvedOrgs: Organization[] = orgMap
    ? (ninja.organizations ?? []).flatMap((ref) => {
        const org = orgMap.get(ref.id);
        return org ? [org] : [];
      })
    : [];
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <h2 className={styles.name}>{ninja.name}</h2>
        {ninja.status && (
          <span className={`${styles.statusBadge} ${STATUS_CLASS[ninja.status] ?? ''}`}>
            {STATUS_LABEL[ninja.status] ?? ninja.status}
          </span>
        )}
      </div>

      {ninja.realName && (
        <p className={styles.realName}>{ninja.realName}</p>
      )}

      {ninja.aliases && ninja.aliases.length > 0 && (
        <div className={styles.aliases}>
          <span className={styles.label}>別名:</span>
          {ninja.aliases.map((alias, idx) => (
            <span key={idx} className={styles.alias}>
              {alias}
            </span>
          ))}
        </div>
      )}

      {ninja.ninjaSoul && (ninja.ninjaSoul.name || ninja.ninjaSoul.grade || ninja.ninjaSoul.clan) && (
        <div className={styles.soul}>
          {/* name があればそれを、なければ grade → clan の順でフォールバック表示 */}
          <Badge
            variant="soul"
            text={ninja.ninjaSoul.name || ninja.ninjaSoul.grade || ninja.ninjaSoul.clan || ''}
          />
        </div>
      )}

      {resolvedOrgs.length > 0 && (
        <div className={styles.organizations}>
          {resolvedOrgs.map((org) => (
            <Badge key={org.id} variant="org" text={org.name} />
          ))}
        </div>
      )}

      {ninja.description && (
        <p className={styles.description}>{ninja.description}</p>
      )}

    </div>
  );
}
