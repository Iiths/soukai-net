import styles from './Badge.module.css';

interface BadgeProps {
  variant: 'soul' | 'org' | 'arc' | 'status';
  text: string;
}

export function Badge({ variant, text }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{text}</span>;
}
