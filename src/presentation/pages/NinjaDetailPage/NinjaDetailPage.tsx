import { useParams, useNavigate } from 'react-router-dom';
import { useNinjaDetail } from '../../hooks/useNinjaDetail';
import { Badge } from '../../components/Badge/Badge';
import styles from './NinjaDetailPage.module.css';

export function NinjaDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ninja, isLoading } = useNinjaDetail(id);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (!ninja) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h2>ニンジャが見つかりません</h2>
          <button onClick={() => navigate('/')} className={styles.backButton}>
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        ← 戻る
      </button>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.nameSection}>
            <h1 className={styles.name}>{ninja.name}</h1>
            {ninja.status && (
              <Badge variant="status" text={ninja.status} />
            )}
          </div>

          {ninja.realName && (
            <p className={styles.realName}>{ninja.realName}</p>
          )}
        </div>

        {ninja.aliases && ninja.aliases.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>別名</h2>
            <div className={styles.aliases}>
              {ninja.aliases.map((alias, idx) => (
                <span key={idx} className={styles.alias}>
                  {alias}
                </span>
              ))}
            </div>
          </section>
        )}

        {ninja.ninjaSoul && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ニンジャソウル</h2>
            <div className={styles.soul}>
              <div className={styles.soulName}>
                <Badge variant="soul" text={ninja.ninjaSoul.name} />
              </div>
              {ninja.ninjaSoul.origin && (
                <p className={styles.soulOrigin}>{ninja.ninjaSoul.origin}</p>
              )}
            </div>
          </section>
        )}

        {ninja.organizations && ninja.organizations.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>所属組織</h2>
            <div className={styles.organizations}>
              {ninja.organizations.map((org) => (
                <Badge key={org.id} variant="org" text={org.name} />
              ))}
            </div>
          </section>
        )}

        {ninja.skills && ninja.skills.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>忍術・スキル</h2>
            <ul className={styles.skills}>
              {ninja.skills.map((skill, idx) => (
                <li key={idx}>{skill}</li>
              ))}
            </ul>
          </section>
        )}

        {ninja.appearances && ninja.appearances.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>登場エピソード</h2>
            <div className={styles.episodes}>
              {ninja.appearances.map((ep) => (
                <div key={ep.id} className={styles.episode}>
                  <div className={styles.episodeTitle}>{ep.title}</div>
                  {ep.arc && (
                    <Badge variant="arc" text={ep.arc} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {ninja.description && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>説明</h2>
            <p className={styles.description}>{ninja.description}</p>
          </section>
        )}

        {ninja.wikiUrl && (
          <section className={styles.section}>
            <a
              href={ninja.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.wikiLink}
            >
              Wikiで詳細を見る →
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
