# CLAUDE.md — soukai-net 作業ガイド

> **目的**: Claudeがissue対応を開始する際にこのファイルを読むことで、  
> `wiki_crawler.py`（737行）などの大ファイルの再読を省略し、作業を即開始できるようにする。
>
> **更新方針**: 新しいスクリプトを作成した・スキーマを変更した・ハマった知見があれば追記する。
> 最終更新: 2026-04-10

---

## 1. プロジェクト概要（30秒）

`src/data/ninjas.json` と `src/data/episodes.json` を静的データストアとする React SPA。  
issue対応の大半は「JSONデータの追加・修正」か「React UIの実装・修正」。

---

## 2. 重要ファイルマップ

```
soukai-net/
├── src/data/
│   ├── ninjas.json        ← ニンジャマスターデータ（~1546件）
│   └── episodes.json      ← エピソードマスターデータ（~152件）
├── src/domain/entities/
│   └── Ninja.ts           ← TypeScript型定義（スキーマの正）
├── ai_tools/
│   ├── wiki_crawler.py          ← メインクローラー（登場人物一覧 → ninjas.json）
│   ├── update_soukaiya.py       ← ソウカイヤ組織データ反映
│   ├── update_zaibatsu.py       ← ザイバツ組織データ反映
│   ├── update_amakudari.py      ← アマクダリ組織データ反映
│   ├── update_slate_and_realninja.py  ← スレイト・リアルニンジャ一覧反映
│   └── fix_ninjas.py            ← 一括クリーンアップ（dry-run対応）
└── soukai-net-issue.md    ← ※このファイルはプロジェクトルートの1つ上（CloudeCode/）にある
```

---

## 3. ninjas.json スキーマ（実例付き）

```json
{
  "id": "177545590",               // uuid4().hex[:8] または既存の数値ID（旧）
  "name": "マスラダ・カイ",          // 必須。Wikiページタイトル or 表記名
  "aliases": ["ニンジャスレイヤー"], // 別名・旧名・リスト掲載名など。省略可
  "realName": "フジキド・ケンジ",    // 本名（判明時のみ）。省略可
  "ninjaType": "ニンジャソウル憑依者", // 下記の型参照。省略可
  "ninjaSoul": {                   // ニンジャソウル情報。省略可
    "id": "fyixlzfs",
    "name": "ナラク・ニンジャ",
    "grade": "等級不明",            // "アーチ級"|"グレーター級"|"レッサー級"|"等級不明"
    "clan": "",
    "origin": ""
  },
  "organizations": [               // 省略可（空配列[]でもOK）
    { "id": "soukaiya-p1", "name": "ソウカイヤ（第1部）" }
  ],
  "appearances": [                 // エピソードIDへの参照。省略可（空配列[]でもOK）
    { "id": "nubhusa7" }
  ],
  "skills": ["我流チャドー", "黒炎"], // 省略可
  "role": "ドン",                   // 役職。手動入力のみ。省略可
  "appearance": "黒いスーツ<br />長身", // 外見描写。改行は <br />。省略可
  "description": "第4部主人公。",   // 自由テキスト。改行は \n。省略可
  "status": "alive",               // "alive"|"dead"|"unknown"。省略可
  "wikiUrl": "https://wikiwiki.jp/njslyr/...", // 省略可
  "imageUrl": "..."                // 未使用。省略可
}
```

### ninjaType の有効値
`"ニンジャソウル憑依者"` | `"リアルニンジャ"` | `"ロボ・ニンジャ"` | `"バイオニンジャ"` | `"非ニンジャ"` | `"カツ・ワンソーの影"`

### organization.id の命名規則
- 汎用: `org_name_from_name()` → `re.sub(r"[^\w\u3040-\u9fff]", "_", name)[:30].strip("_").lower()`
- 例外（手動指定）: `"soukaiya-p1"`, `"soukaiya-p4"`, `"zaibatsu-p1"` など部つき組織
- ⚠️ `"ソウカイヤ"` `"ザイバツ"` 単体の org_name は `BLOCKED_ORG_NAMES` に登録済みで追加禁止

---

## 4. episodes.json スキーマ

```json
{ "id": "8fffe24e", "title": "スレイト・オブ・ニンジャ" }
{ "id": "k99nm6ll", "title": "アイス・クラッシュ", "arc": "第1部" }
{ "id": "vr3fq73p", "title": "バトルグラウンド・サツ・バツ", "arc": "外伝" }
```

- `arc` は省略可。第4部以降には `"season": 数値` も存在する。
- ninjas.json の `appearances` は `{ "id": エピソードID }` のみ格納（タイトルは持たない）。

---

## 5. スクレイピングスクリプトの共通パターン

新しい `update_*.py` を書く際のテンプレート知識:

### インデックス構築
```python
def build_index(ninjas):
    idx_name, idx_url = {}, {}
    for n in ninjas:
        idx_name[n["name"]] = n
        for a in (n.get("aliases") or []):
            idx_name[a] = n
        if n.get("wikiUrl"):
            idx_url[n["wikiUrl"]] = n
    return idx_name, idx_url
```

### ID生成
```python
import uuid
def make_id(): return uuid.uuid4().hex[:8]
```

### 新規エントリの最小構成
```python
{
    "id": make_id(),
    "name": name,
    "organizations": [{"id": org_id, "name": org_name}],
    "appearances": [],
}
```

### マージの原則（非破壊）
- 既存エントリの **手動入力フィールド**（role / appearance / description / skills）は**絶対に上書きしない**
- null/空フィールドのみ補完する
- organizations / aliases は**追記のみ**（削除しない）
- wikiUrl は既存が空の場合のみセット

### HTTP リクエスト
```python
REQUEST_DELAY = 1.5  # サーバー負荷対策（必須）
resp.encoding = "utf-8"  # wikiwiki.jpは明示指定が必要
soup = BeautifulSoup(resp.text, "html.parser")
content = soup.find(id="content")  # wikiwiki.jpのメインコンテンツ領域
```

---

## 6. wiki_crawler.py の主要な設計知識

wiki_crawler.py を読まずに済むよう要点をまとめる。

### ページ構造（wikiwiki.jp）
- キャラクターリンクは `<ul class="list2">` 内の `<a title="名前">` に格納
- 大組織（ソウカイヤ等）: H2/H3 → `<p>組織ページ参照リンク</p>` → 組織ページをトラバース
- 小組織（その他）: H3 → `<ul class="list1">` → `<ul class="list2">` → キャラリンク
- ⚠️ `html.parser` は `<hr class="full_hr">` を誤ってコンテナ扱いするため、  
  `content.children` 反復では H2/H3 が見えない → `content.find_all()` で全子孫から取得

### is_char_link() のロジック
`href` が `/njslyr/` 始まり かつ 以下を含まない:
- `::cmd`（編集リンク）
- `「`（エピソードページ）
- `登場人物一覧` / `リアルニンジャ一覧` 等（一覧ページ）
- 非キャラクターページ名（地名・武器・組織ページ等）

### Phase構成
| Phase | 内容 | オプション |
|---|---|---|
| Phase1 | 一覧→組織ページをトラバース、全エントリ収集 | `--phase 1` で保存のみ |
| Phase2 | 個別ページから詳細取得（soul/type/status） | `--no-detail` でスキップ |
| Merge | ninjas.json にマージ | `--dry-run` で確認のみ |

### 個別ページから取得できる情報
- ニンジャ名鑑カード → ソウル名・等級
- ニンジャクラン
- 死亡キーワード → status: "dead"
- ニンジャタイプ推定

---

## 7. よくあるissueパターン

### パターンA: 新しいWikiページから登場人物追加
1. 対象ページのHTML構造を確認（H2/H3/H4の構成、リンクの有無）
2. `update_*.py` スクリプトを新規作成（既存の `update_slate_and_realninja.py` が参考になる）
3. `--dry-run` で確認 → 本番実行 → git commit

### パターンB: 既存エントリの組織・別名・URL追加
1. 対象キャラを name / wikiUrl で検索
2. 非破壊マージで追記
3. git commit

### パターンC: UIの修正・追加
1. `src/presentation/` 配下の該当コンポーネントを編集
2. `src/domain/entities/Ninja.ts` の型定義も必要に応じて変更

---

## 8. 実行コマンドリファレンス

```bash
# 開発サーバー
npm run dev     # http://localhost:5173

# スクレイピング（soukai-net/ から実行）
python ai_tools/wiki_crawler.py                   # 全件
python ai_tools/wiki_crawler.py --dry-run          # 確認のみ
python ai_tools/wiki_crawler.py --no-detail        # 個別ページ取得スキップ（高速）
python ai_tools/wiki_crawler.py --phase 1          # 収集のみ
python ai_tools/wiki_crawler.py --phase 2          # キャッシュからマージ

python ai_tools/update_slate_and_realninja.py      # スレイト・リアルニンジャ
python ai_tools/update_slate_and_realninja.py --dry-run
python ai_tools/update_slate_and_realninja.py --slate-only
python ai_tools/update_slate_and_realninja.py --realninja-only

python ai_tools/fix_ninjas.py                      # クリーンアップ
python ai_tools/fix_ninjas.py --dry-run
```

---

## 9. ハマりポイント・注意事項

- **issue管理ファイルの場所**: `CloudeCode/soukai-net-issue.md`（このプロジェクトの**外**にある）
- **git push はISに依頼**: commit まで行い、push はユーザーが手動実行
- **wikiUrl のURLエンコード**: wikiwiki.jp のリンクは日本語パスがURLエンコードされている。  
  `unquote()` でデコードしてから日本語キーワードと比較すること
- **重複ID防止**: 新規エントリのIDは `uuid4().hex[:8]` で生成。既存の `177545590` 形式（旧ID）と混在しているが問題なし
- **appearances はIDのみ**: `{ "id": "xxxx" }` のみ。タイトルや部を入れない
- **description の改行**: `\n` を使う。appearance フィールドは `<br />` を使う（UIの描画差異）
