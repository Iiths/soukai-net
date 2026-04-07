# soukai-net — キックオフドキュメント

> ニンジャスレイヤー ニンジャデータベース SPA
> 作成日: 2026-04-05
> 共作: IS × Claude (Anthropic)

---

## 1. プロジェクト概要

**soukai-net** は、ニンジャスレイヤー作品に登場するニンジャの情報を検索・閲覧できるWebデータベースアプリケーション。
現在、有志Wikiが実質的なデータベースとして機能しているが、検索性・UXの向上を目的として独立したSPAとして実装する。

### ゴール
- ニンジャを名称・ニンジャソウル・所属組織・登場部などで素早く検索できる
- 個別のニンジャの詳細情報を見やすく表示する
- Figmaベースのデザインカスタマイズに対応できる構造にする
- OSSとしてGitHubで公開し、コミュニティへの貢献を目指す

---

## 2. 技術スタック

| 項目 | 採用技術 | 理由 |
|---|---|---|
| フレームワーク | React 18 | SPA要件・エコシステムの豊富さ |
| 言語 | TypeScript | 型安全・クリーンアーキテクチャとの親和性 |
| ビルドツール | Vite | 高速ビルド・開発体験 |
| ルーティング | React Router v6 | 標準的なSPAルーティング |
| スタイリング | CSS Modules | Figmaコンポーネントとのクラス名対応、スコープ明確 |
| テスト | Vitest + Testing Library | Viteとの統合性 |
| データ形式 | JSON（静的ファイル） | 初期実装。後でAPI化も可 |
| パッケージ管理 | npm | 標準 |

---

## 3. アーキテクチャ設計（クリーンアーキテクチャ）

```
┌─────────────────────────────────────────────────────────┐
│  Frameworks & Drivers（最外層）                          │
│  React Components / CSS Modules / React Router           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Interface Adapters                               │  │
│  │  Presenters / ViewModels / Repository Impl        │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  Use Cases（アプリケーション層）               │  │  │
│  │  │  SearchNinja / GetNinjaDetail / FilterNinja  │  │  │
│  │  │  ┌───────────────────────────────────────┐   │  │  │
│  │  │  │  Domain（最内層・フレームワーク非依存）  │   │  │  │
│  │  │  │  Entities: Ninja, NinjaSoul,          │   │  │  │
│  │  │  │           Organization, Episode       │   │  │  │
│  │  │  │  Repository Interfaces                │   │  │  │
│  │  │  └───────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 依存関係の方向
- 内側の層は外側の層を知らない
- Domain層はReactもブラウザAPIも一切importしない
- Use Cases層はDomain層のみに依存
- React ComponentsはUse Cases層のインターフェースを通じてデータを取得

---

## 4. ディレクトリ構造

```
soukai-net/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                    # エントリーポイント
│   ├── App.tsx                     # ルーティング設定
│   │
│   ├── domain/                     # ドメイン層（最内層）
│   │   ├── entities/
│   │   │   ├── Ninja.ts            # ニンジャエンティティ
│   │   │   ├── NinjaSoul.ts        # ニンジャソウルエンティティ
│   │   │   ├── Organization.ts     # 所属組織エンティティ
│   │   │   └── Episode.ts          # 登場エピソードエンティティ
│   │   └── repositories/
│   │       └── NinjaRepository.ts  # リポジトリインターフェース
│   │
│   ├── usecases/                   # ユースケース層
│   │   ├── SearchNinjaUseCase.ts
│   │   ├── GetNinjaDetailUseCase.ts
│   │   └── FilterNinjaUseCase.ts
│   │
│   ├── infrastructure/             # インフラ層（外側）
│   │   └── repositories/
│   │       └── JsonNinjaRepository.ts  # JSONからの実装
│   │
│   ├── presentation/               # プレゼンテーション層（React）
│   │   ├── pages/
│   │   │   ├── SimpleSearchPage/   # 簡易検索画面
│   │   │   ├── AdvancedSearchPage/ # 詳細検索画面
│   │   │   └── NinjaDetailPage/    # ニンジャ詳細画面
│   │   ├── components/             # 共通コンポーネント
│   │   │   ├── NinjaCard/          # ニンジャカード（一覧表示用）
│   │   │   ├── NinjaDetail/        # ニンジャ詳細情報
│   │   │   ├── SearchBar/          # 検索バー
│   │   │   ├── FilterPanel/        # 詳細検索フィルター
│   │   │   ├── Badge/              # ニンジャソウル・組織バッジ
│   │   │   └── Layout/             # レイアウト共通
│   │   └── hooks/
│   │       ├── useNinjaSearch.ts
│   │       └── useNinjaDetail.ts
│   │
│   └── data/
│       └── ninjas.json             # ニンジャデータ（静的JSON）
│
└── public/
    └── favicon.ico
```

---

## 5. ドメインモデル

### Ninja（中心エンティティ）

```typescript
type Ninja = {
  id: string;
  name: string;              // ニンジャ名（例: サイバーネン）
  realName?: string;         // 本名（判明している場合）
  aliases?: string[];        // 別名・異名
  ninjaSoul?: NinjaSoul;     // 憑依しているニンジャソウル
  organizations?: Organization[]; // 所属組織
  appearances: Episode[];    // 登場エピソード・部
  skills?: string[];         // 忍術・固有スキル
  description?: string;      // 概要
  status?: 'alive' | 'dead' | 'unknown';
  imageUrl?: string;         // 画像URL（将来用）
  wikiUrl?: string;          // 元Wikiへのリンク
};
```

---

## 6. 画面設計

### 6-1. 簡易検索画面 `/`
- 検索バー（名前での部分一致検索）
- 結果一覧（NinjaCard × n）
- 各カードをクリックで詳細へ

### 6-2. 詳細検索画面 `/search`
- フィルターパネル
  - 登場部（第X部）での絞り込み
  - ニンジャソウル名での絞り込み
  - 所属組織での絞り込み
  - ステータス（生存/死亡/不明）
- 結果一覧

### 6-3. ニンジャ詳細画面 `/ninja/:id`
- ニンジャ名・本名・別名
- ニンジャソウル情報
- 所属組織
- 登場エピソード一覧
- 使用ジツ・カラテなど
- 概要テキスト
- Wikiへのリンク

---

## 7. データ取得戦略（3案）

### 案A: 静的JSON管理（推奨・初期実装）
`src/data/ninjas.json` に構造化データを手動または半自動で整備。
GitHubでバージョン管理。コミュニティがPRで追加できる。

**メリット**: シンプル・高速・オフライン動作
**デメリット**: 手動メンテナンス必要

### 案B: Wiki APIの活用（中期）
MediaWiki系WikiはAPI（`/api.php?action=query`）を持つ。
ニンジャスレイヤーWikiがMediaWikiベースであれば、APIから自動取得可能。
定期クローリング → JSON更新 → GitHubにコミットのパイプラインを構築。

**メリット**: 自動更新可能
**デメリット**: Wiki構造の変化に弱い。Wikiの利用規約確認が必要

### 案C: Claude支援インポート（実用的な中間策）
Wikiのページ本文をコピー貼り付け → Claude が構造化JSON に変換 → JSONファイルに追記。
`ai_tools/` に `wiki_to_json.py` を追加することで半自動化できる。

**メリット**: 手打ちより大幅に効率的。精度が高い
**デメリット**: Claudeへのアクセスが都度必要

### 推奨ロードマップ
```
初期: 案A（サンプルデータ + 手動追加）
↓
中期: 案C（Claude支援インポートで一括投入）
↓
将来: 案B（Wiki APIパイプラインの自動化）
```

---

## 8. Figmaデザイン引き継ぎ対応

CSS Modulesを採用することで、以下の対応が容易になる：

- **デザイントークン**: `src/styles/tokens.css` に色・タイポグラフィなどを CSS カスタムプロパティで定義
- **コンポーネント単位のCSSファイル**: `NinjaCard.module.css` のようにコンポーネント1対1対応
- **デザイナーへの引き継ぎ資料**: 各コンポーネントのProps一覧を `components/README.md` に記載
- **Figmaの命名規則との対応**: コンポーネント名・クラス名をFigmaのレイヤー名と一致させることを推奨

---

## 9. マイルストーン

| フェーズ | 内容 | 状態 |
|---|---|---|
| M1 | プロジェクト初期化・ドメイン設計・サンプルデータ | ✅ 本セッションで実施 |
| M2 | 3画面の基本実装（検索・詳細検索・詳細） | ✅ 本セッションで実施 |
| M3 | スタイリング（デザイナー担当 or 仮スタイル） | 🔲 別途 |
| M4 | データ拡充（Claude支援インポート） | 🔲 別途 |
| M5 | Wiki API連携パイプライン | 🔲 将来 |
| M6 | GitHub公開・README整備 | 🔲 別途 |

---

## 10. GitHub公開時の記載事項

```markdown
## 共作について

このプロジェクトは IS と Claude (Anthropic) の共同作業により実装されました。
アーキテクチャ設計、コードの実装、ドキュメント作成において Claude の支援を受けています。

## Contributing

ニンジャデータの追加・修正は `src/data/ninjas.json` へのPRを歓迎します。
データスキーマは `src/domain/entities/Ninja.ts` を参照してください。
```

---

*このドキュメントは soukai-net のキックオフ資料として作成されました。*
*作成: 2026-04-05 by IS × Claude*
