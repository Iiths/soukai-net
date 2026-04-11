import { Ninja } from '../../../domain/entities/Ninja';
import styles from './NinjaCard.module.css';
import { Badge } from '../Badge/Badge';

interface NinjaCardProps {
  ninja: Ninja;
  onClick?: () => void;
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

export function NinjaCard({ ninja, onClick }: NinjaCardProps) {
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

      {ninja.organizations && ninja.organizations.length > 0 && (
        <div className={styles.organizations}>
          {ninja.organizations.map((org) => (
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
