import { Ninja } from '../../../domain/entities/Ninja';
import styles from './NinjaCard.module.css';
import { Badge } from '../Badge/Badge';

interface NinjaCardProps {
  ninja: Ninja;
  onClick?: () => void;
}

export function NinjaCard({ ninja, onClick }: NinjaCardProps) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.header}>
        <h2 className={styles.name}>{ninja.name}</h2>
        {ninja.status && (
          <Badge variant="status" text={ninja.status} />
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

      {ninja.ninjaSoul && (
        <div className={styles.soul}>
          <Badge variant="soul" text={ninja.ninjaSoul.name} />
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
