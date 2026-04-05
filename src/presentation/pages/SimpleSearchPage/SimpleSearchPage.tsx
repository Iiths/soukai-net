import { useNavigate } from 'react-router-dom';
import { useNinjaSearch } from '../../hooks/useNinjaSearch';
import { SearchBar } from '../../components/SearchBar/SearchBar';
import { NinjaCard } from '../../components/NinjaCard/NinjaCard';
import styles from './SimpleSearchPage.module.css';

export function SimpleSearchPage() {
  const navigate = useNavigate();
  const { query, results, isLoading, search } = useNinjaSearch();

  const handleCardClick = (id: string) => {
    navigate(`/ninja/${id}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ニンジャを検索</h1>
        <p className={styles.subtitle}>
          名前またはニンジャソウル名で検索します
        </p>
      </div>

      <div className={styles.searchSection}>
        <SearchBar value={query} onChange={search} />
      </div>

      {isLoading && (
        <div className={styles.loading}>検索中...</div>
      )}

      {!isLoading && query && results.length === 0 && (
        <div className={styles.noResults}>
          「{query}」の検索結果はありません
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className={styles.resultsSection}>
          <h2 className={styles.resultCount}>
            {results.length}件のニンジャが見つかりました
          </h2>
          <div className={styles.grid}>
            {results.map((ninja) => (
              <NinjaCard
                key={ninja.id}
                ninja={ninja}
                onClick={() => handleCardClick(ninja.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !query && (
        <div className={styles.empty}>
          <p>ニンジャの名前を入力して検索を開始してください</p>
        </div>
      )}
    </div>
  );
}
