import { Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>SOUKAI.NET</span>
          </Link>
          <nav className={styles.nav}>
            <Link
              to="/"
              className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
            >
              簡易検索
            </Link>
            <Link
              to="/search"
              className={`${styles.navLink} ${isActive('/search') ? styles.active : ''}`}
            >
              詳細検索
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.credit}>
            SOUKAI.NET - ニンジャデータベース
          </p>
        </div>
      </footer>
    </div>
  );
}
