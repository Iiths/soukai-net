import { useParams, useNavigate } from 'react-router-dom';
import { useNinjaDetail } from '../../hooks/useNinjaDetail';
import { useIsLocalDev } from '../../hooks/useIsLocalDev';
import { Badge } from '../../components/Badge/Badge';
import styles from './NinjaDetailPage.module.css';

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

/** 値がある（null/undefined/''/[]でない）かを判定 */
function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** 未登録の場合に表示するプレースホルダー */
function Empty({ label }: { label: string }) {
  return (
    <span className={styles.emptyValue}>
      {label}（未登録）
    </span>
  );
}

/** <br /> タグまたは \n を React の改行要素に変換して表示 */
function WithLineBreaks({ text }: { text: string }) {
  // <br /> タグを \n に正規化してから分割
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');
  const parts = normalized.split('\n');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>{part}{i < parts.length - 1 && <br />}</span>
      ))}
    </>
  );
}

export function NinjaDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isLocalDev = useIsLocalDev();
  const { ninja, episodes, organizations, isLoading } = useNinjaDetail(id);

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
      <div className={styles.topBar}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← 戻る
        </button>
        {isLocalDev && (
          <button
            onClick={() => navigate(`/ninja/${ninja.id}/edit`)}
            className={styles.editButton}
          >
            編集
          </button>
        )}
      </div>

      <div className={styles.container}>
        {/* ヘッダー: 名前・ステータス */}
        <div className={styles.header}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{ninja.name}</h1>
            {hasValue(ninja.status) && (
              <span className={`${styles.statusBadge} ${STATUS_CLASS[ninja.status!] ?? ''}`}>
                {STATUS_LABEL[ninja.status!] ?? ninja.status}
              </span>
            )}
          </div>
          {hasValue(ninja.realName) && (
            <p className={styles.realName}>本名: {ninja.realName}</p>
          )}
        </div>

        {/* 基本情報グリッド */}
        <div className={styles.infoGrid}>
          {/* 別名 */}
          {hasValue(ninja.aliases) && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>別名</div>
              <div className={styles.infoValue}>
                <div className={styles.tagRow}>
                  {ninja.aliases!.map((alias, i) => (
                    <span key={i} className={styles.aliasTag}>{alias}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ニンジャタイプ */}
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>ニンジャタイプ</div>
            <div className={styles.infoValue}>
              {hasValue(ninja.ninjaType)
                ? <span className={styles.ninjaTypeTag}>{ninja.ninjaType}</span>
                : <Empty label="タイプ" />}
            </div>
          </div>

          {/* 役職 */}
          {hasValue(ninja.role) && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>役職</div>
              <div className={styles.infoValue}>
                <span className={styles.roleTag}>{ninja.role}</span>
              </div>
            </div>
          )}
        </div>

        {/* 外見 */}
        {hasValue(ninja.appearance) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>外見</h2>
            <p className={styles.appearanceText}><WithLineBreaks text={ninja.appearance!} /></p>
          </section>
        )}

        {/* ニンジャソウル — name が空でも grade/clan/origin があれば表示 */}
        {ninja.ninjaSoul && (
          hasValue(ninja.ninjaSoul.name) ||
          hasValue(ninja.ninjaSoul.grade) ||
          hasValue(ninja.ninjaSoul.clan) ||
          hasValue(ninja.ninjaSoul.origin)
        ) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ニンジャソウル</h2>
            <div className={styles.soulCard}>
              <div className={styles.soulHeader}>
                {/* 名前が不明な場合は Badge を出さない */}
                {hasValue(ninja.ninjaSoul.name) && (
                  <Badge variant="soul" text={ninja.ninjaSoul.name!} />
                )}
                {hasValue(ninja.ninjaSoul.grade) && (
                  <span className={styles.soulGrade}>{ninja.ninjaSoul.grade}ニンジャ</span>
                )}
              </div>
              <dl className={styles.soulDetail}>
                {hasValue(ninja.ninjaSoul.clan) && (
                  <>
                    <dt>クラン</dt>
                    <dd>{ninja.ninjaSoul.clan}</dd>
                  </>
                )}
                {hasValue(ninja.ninjaSoul.origin) && (
                  <>
                    <dt>出自</dt>
                    <dd>{ninja.ninjaSoul.origin}</dd>
                  </>
                )}
              </dl>
            </div>
          </section>
        )}

        {/* 所属組織 */}
        {organizations.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>所属組織</h2>
            <div className={styles.tagRow}>
              {organizations.map((org) => (
                <Badge key={org.id} variant="org" text={org.name} />
              ))}
            </div>
          </section>
        )}

        {/* ジツ・カラテなど */}
        {hasValue(ninja.skills) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ジツ・カラテなど</h2>
            <ul className={styles.skillList}>
              {ninja.skills!.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 登場エピソード */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>登場エピソード</h2>
          {episodes.length > 0 ? (
            <div className={styles.episodeGrid}>
              {episodes.map((ep) => (
                <div key={ep.id} className={styles.episodeCard}>
                  <div className={styles.epTitle}>{ep.title}</div>
                  <div className={styles.epMeta}>
                    {hasValue(ep.arc) && <Badge variant="arc" text={ep.arc!} />}
                    {ep.season !== undefined && (
                      <span className={styles.epSeason}>S{ep.season}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty label="エピソード" />}
        </section>

        {/* 説明 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>説明</h2>
          {hasValue(ninja.description)
            ? <p className={styles.description}><WithLineBreaks text={ninja.description!} /></p>
            : <Empty label="説明" />}
        </section>

        {/* メタ情報フッター（画像URL・WikiURLがある場合のみ表示） */}
        {(hasValue(ninja.imageUrl) || hasValue(ninja.wikiUrl)) && (
          <div className={styles.metaFooter}>
            {hasValue(ninja.imageUrl) && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>画像URL</span>
                <code className={styles.metaCode}>{ninja.imageUrl}</code>
              </div>
            )}
            {hasValue(ninja.wikiUrl) && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Wiki</span>
                <a
                  href={ninja.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.wikiLink}
                >
                  {ninja.wikiUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}