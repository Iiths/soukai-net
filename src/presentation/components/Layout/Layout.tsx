import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNinjaEditContext } from '../../context/NinjaEditContext';
import { useIsLocalDev } from '../../hooks/useIsLocalDev';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLocalDev = useIsLocalDev();
  const { downloadNinjas, overrideCount } = useNinjaEditContext();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            <img src="/soukai-icon.png" alt="" className={styles.logoIcon} />
            <span className={styles.logoText}>SOUKAI<span>.NET</span></span>
          </Link>
          <nav className={styles.nav}>
            <Link
              to="/"
              className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
            >
              ニンジャ検索
            </Link>
            {isLocalDev && (
              <button
                className={styles.navButton}
                onClick={() => navigate('/ninja/new/edit')}
                title="新しいニンジャを追加する"
              >
                ＋ 新規追加
              </button>
            )}
            {isLocalDev && (
              <button
                className={`${styles.navButton} ${styles.navButtonSave}`}
                onClick={downloadNinjas}
                title={`ninjas.json をダウンロード（編集 ${overrideCount} 件反映）`}
              >
                📥 ninjas.json 保存
                {overrideCount > 0 && (
                  <span className={styles.navBadge}>{overrideCount}</span>
                )}
              </button>
            )}
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
