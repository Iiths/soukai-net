# SOUKAI.NET — ニンジャデータベース SPA

> ニンジャスレイヤー ニンジャデータベース React SPA
>
> **Tech**: Vite + React 18 + TypeScript + CSS Modules + React Router v6
> **Architecture**: Clean Architecture

## 概要

**SOUKAI.NET** は、ニンジャスレイヤー作品に登場するニンジャの情報を検索・閲覧できるシングルページアプリケーションです。

### 主な機能

- **簡易検索**: ニンジャの名前またはニンジャソウル名で素早く検索
- **詳細検索**: 登場部・ニンジャソウル・所属組織・ステータスで複数条件絞り込み
- **詳細表示**: ニンジャの全情報を見やすくダッシュボード表示

## プロジェクト構造

```
soukai-net/
├── src/
│   ├── domain/              # ドメイン層（ビジネスロジック）
│   │   ├── entities/        # Ninja, NinjaSoul, Organization, Episode
│   │   └── repositories/    # NinjaRepository インターフェース
│   │
│   ├── usecases/            # ユースケース層
│   │   ├── SearchNinjaUseCase.ts
│   │   ├── GetNinjaDetailUseCase.ts
│   │   └── FilterNinjaUseCase.ts
│   │
│   ├── infrastructure/      # インフラ層
│   │   └── repositories/    # JsonNinjaRepository（実装）
│   │
│   ├── presentation/        # プレゼンテーション層（React）
│   │   ├── pages/           # ページコンポーネント
│   │   ├── components/      # 共通コンポーネント
│   │   └── hooks/           # カスタムフック
│   │
│   ├── styles/              # 共有スタイル（デザイントークン）
│   └── data/                # 静的データ（ninjas.json）
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## クリーンアーキテクチャ

このプロジェクトは**クリーンアーキテクチャ**の原則に従い、層の依存関係を明確に分離しています。

### 層構造

1. **Domain Layer**（最内層）
   - ビジネスロジック・エンティティを定義
   - React や任意のフレームワークに依存しない

2. **Use Cases Layer**
   - Domain層のエンティティを使用したアプリケーションロジック
   - SearchNinja / GetNinjaDetail / FilterNinja の3つのユースケース

3. **Infrastructure Layer**
   - Domain層のリポジトリインターフェースを実装
   - JSONファイルからのデータ取得

4. **Presentation Layer**（最外層）
   - React コンポーネント
   - ユースケースを通じてDomain層にアクセス

## セットアップ

### 前提条件
- Node.js 16.0 以上
- npm 8.0 以上

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

`http://localhost:5173` でアプリケーションが起動します。

### ビルド

```bash
npm run build
```

`dist/` ディレクトリに最適化されたビルドが出力されます。

### プレビュー

```bash
npm run preview
```

ビルド後のアプリケーションをプレビューします。

## 使用技術

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 18 |
| 言語 | TypeScript |
| ビルド | Vite |
| ルーティング | React Router v6 |
| スタイリング | CSS Modules + CSS Custom Properties |
| パッケージ管理 | npm |

## 画面一覧

### 1. 簡易検索 (`/`)
- 名前での部分一致検索
- リアルタイム検索結果表示
- ニンジャカード一覧

### 2. 詳細検索 (`/search`)
- 複数条件でのフィルタ
  - 登場部（第X部）
  - ニンジャソウル名
  - 所属組織
  - ステータス（生存/死亡/不明）

### 3. ニンジャ詳細 (`/ninja/:id`)
- フルプロフィール表示
- スキル・忍術一覧
- 登場エピソード一覧
- Wiki リンク

## サンプルデータ

`src/data/ninjas.json` に7体のニンジャサンプルデータを含みます。

- ナンシー
- サイバーネン
- アンコク・ダークニンジャ
- フジキド・ケンジ（ニンジャスレイヤー）
- ニグレオス・ソムニア
- マダム・ラオフウ
- ランニンガー

## デザイン

### カラーパレット（ダークテーマ）

```css
--color-bg: #0a0a0f;              /* 背景 */
--color-surface: #111118;         /* サーフェース */
--color-primary: #e63946;         /* プライマリ（赤） */
--color-accent: #ffd60a;          /* アクセント（黄） */
--color-text: #e0e0e0;            /* テキスト */
--color-soul: #9b5de5;            /* ニンジャソウル用 */
--color-org: #00b4d8;             /* 組織用 */
--color-arc: #06d6a0;             /* 登場部用 */
```

### CSS Modules

各コンポーネントに対応する `.module.css` ファイルを配置し、スコープを明確に分離しています。

```typescript
import styles from './Component.module.css';

export function Component() {
  return <div className={styles.container}>...</div>;
}
```

## コントリビューション

データの追加・修正は `src/data/ninjas.json` へのPRを歓迎します。

スキーマ定義は `src/domain/entities/Ninja.ts` を参照してください。

## ライセンス

このプロジェクトはIS × Claude (Anthropic)の共同作業により実装されました。

## 関連リソース

- [KICKOFF.md](./KICKOFF.md) — プロジェクト企画書
- ニンジャスレイヤーWiki: https://ninjasrv.web.fc2.com/

---

**Created**: 2026-04-05
**Status**: ✅ Fully Implemented
