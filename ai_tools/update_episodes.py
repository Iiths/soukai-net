#!/usr/bin/env python3
"""
エピソード一覧スクレイピング → episodes.json 更新スクリプト

【ソースURL】
  第1部: https://wikiwiki.jp/njslyr/エピソード一覧/第1部
  第2部: https://wikiwiki.jp/njslyr/エピソード一覧/第2部
  第3部: https://wikiwiki.jp/njslyr/エピソード一覧/第3部
  第4部: https://wikiwiki.jp/njslyr/エピソード一覧/第4部
  外伝 : https://wikiwiki.jp/njslyr/エピソード一覧/その他エピソード

【ページ構造（実測）】
  第1〜3部: H4見出し = エピソードタイトル（例: 「ニード・フォー・アナザー・クルセイド」（English）[1][C]）
  第4部   : H3見出し でシーズン番号を追跡（「シーズンN」の有無）
            H4見出し = エピソードタイトル
            ※シーズン記載なし（◆予告編◆ / ◆本編以前◆ / ◆アイアン・アトラス・シリーズ◆ 等）の配下は season=なし
  その他  : H3/H4見出し = エピソードタイトル（H2はシリーズ/企画名なのでスキップ）

【タイトル抽出ルール】
  - 「」内の日本語タイトルのみを取得
  - 英語訳（英字括弧）、注釈[N][C]、[S]、「連載中」などは除去
  - 「第N話〜」「幕間〜」「序章〜」「ボーナストラック〜」などの接頭辞は捨てる（「」の外）

【マージルール】
  - title 完全一致で重複チェック（既存エントリは変更しない）
  - 新規エントリのみ追加 + ID自動生成

【使い方】（soukai-net/ から実行）
  python ai_tools/update_episodes.py             # 通常実行
  python ai_tools/update_episodes.py --dry-run   # 確認のみ（JSON変更なし）
"""

import argparse
import json
import re
import time
import uuid
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.run(["pip", "install", "requests", "beautifulsoup4",
                    "--break-system-packages", "-q"],
                   check=True, capture_output=True)
    import requests
    from bs4 import BeautifulSoup

# ============================================================
# 設定
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
EPISODES_JSON = BASE_DIR / "src" / "data" / "episodes.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SoukaiNetCrawler/3.0)",
    "Accept-Language": "ja,en;q=0.9",
}
REQUEST_DELAY = 1.5

SOURCES = [
    {
        "label": "第1部",
        "url": ("https://wikiwiki.jp/njslyr/"
                "%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7"
                "/%E7%AC%AC1%E9%83%A8"),
        "arc": "第1部",
        "use_season": False,
    },
    {
        "label": "第2部",
        "url": ("https://wikiwiki.jp/njslyr/"
                "%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7"
                "/%E7%AC%AC2%E9%83%A8"),
        "arc": "第2部",
        "use_season": False,
    },
    {
        "label": "第3部",
        "url": ("https://wikiwiki.jp/njslyr/"
                "%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7"
                "/%E7%AC%AC3%E9%83%A8"),
        "arc": "第3部",
        "use_season": False,
    },
    {
        "label": "第4部",
        "url": ("https://wikiwiki.jp/njslyr/"
                "%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7"
                "/%E7%AC%AC4%E9%83%A8"),
        "arc": "第4部",
        "use_season": True,
    },
    {
        "label": "その他（外伝）",
        "url": ("https://wikiwiki.jp/njslyr/"
                "%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7"
                "/%E3%81%9D%E3%81%AE%E4%BB%96%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89"),
        "arc": "外伝",
        "use_season": False,
    },
]

# ============================================================
# ユーティリティ
# ============================================================

def fetch(url: str, label: str = "") -> "BeautifulSoup | None":
    try:
        time.sleep(REQUEST_DELAY)
        resp = requests.get(url, headers=HEADERS, timeout=25)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        print(f"  ⚠ 取得失敗 ({label}): {e}")
        return None


def make_id() -> str:
    return uuid.uuid4().hex[:8]


def extract_title(heading_text: str) -> "str | None":
    """
    H4/H3 見出しテキストから「」内のタイトルを抽出。
    例:
      「ニード・フォー・アナザー・クルセイド」（Need for Another Crusade）[1][C]
        → ニード・フォー・アナザー・クルセイド
      第1話「トーメント・イーブン・アフター・デス」（Torment Even after Death）[1]
        → トーメント・イーブン・アフター・デス
      第9&10話「タイラント・オブ・マッポーカリプス」（Tyrant of Mappor-Calypse）
        → タイラント・オブ・マッポーカリプス
    """
    m = re.search(r'「([^」]+)」', heading_text)
    return m.group(1).strip() if m else None


def extract_season_from_h3(heading_text: str) -> "int | None | str":
    """
    H3見出しからシーズン番号を抽出。
    シーズン記載あり → 数値
    シーズン記載なし → None（= season 設定なし）
    Returns:
      int   : シーズン番号が見つかった
      None  : シーズン記載なし（更新しない）
    """
    m = re.search(r'シーズン(\d+)', heading_text)
    return int(m.group(1)) if m else None


# ============================================================
# スクレイピング
# ============================================================

def scrape_source(source: dict) -> list[dict]:
    """1ソースのエピソード一覧を抽出して返す。
    Returns: [{"title": str, "arc": str, "season": int|None}, ...]
    """
    label   = source["label"]
    url     = source["url"]
    arc     = source["arc"]
    use_season = source["use_season"]

    print(f"\n[{label}] 取得中: {url}")
    soup = fetch(url, label)
    if not soup:
        return []

    content = soup.find(id="content")
    if not content:
        print(f"  ⚠ id='content' 未検出")
        return []

    episodes: list[dict] = []
    # 第4部のみ H3 からシーズン番号を追跡
    # None = シーズン設定なし（◆予告編◆ / ◆本編以前◆ 等の配下）
    current_season: "int | None" = None
    seen_titles: set[str] = set()

    all_headings = content.find_all(["h2", "h3", "h4"])

    for h in all_headings:
        tag  = h.name
        text = h.get_text(strip=True)

        # ── H2 は常にスキップ（シリーズ・企画名） ──
        if tag == "h2":
            continue

        # ── H3 ──
        if tag == "h3":
            if use_season:
                # 第4部: H3 でシーズン番号を更新
                # シーズン記載なし H3 が来たら season をリセット
                season = extract_season_from_h3(text)
                current_season = season  # None でもそのまま上書き
            else:
                # その他ページ: H3 もエピソードとして処理
                title = extract_title(text)
                if title and title not in seen_titles:
                    seen_titles.add(title)
                    episodes.append({"title": title, "arc": arc, "season": None})
            continue

        # ── H4 ──
        if tag == "h4":
            title = extract_title(text)
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            season = current_season if use_season else None
            episodes.append({"title": title, "arc": arc, "season": season})

    print(f"  → {len(episodes)}件 取得")
    return episodes


# ============================================================
# メイン
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="エピソード一覧スクレイピング → episodes.json 更新"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="episodes.json を変更せず処理内容を確認")
    args = parser.parse_args()

    # ── 既存データ読み込み ──
    print(f"[Load] {EPISODES_JSON}")
    with open(EPISODES_JSON, encoding="utf-8") as f:
        episodes: list = json.load(f)
    print(f"  既存エピソード: {len(episodes)}件")

    existing_titles: set[str] = {ep["title"] for ep in episodes}

    # ── スクレイピング ──
    all_scraped: list[dict] = []
    for source in SOURCES:
        all_scraped.extend(scrape_source(source))

    # ── マージ ──
    new_entries: list[dict] = []
    added_titles: set[str] = set()

    for ep in all_scraped:
        title = ep["title"]
        if title in existing_titles or title in added_titles:
            continue  # 重複スキップ

        added_titles.add(title)
        entry: dict = {"id": make_id(), "title": title}
        if ep.get("arc"):
            entry["arc"] = ep["arc"]
        if ep.get("season") is not None:
            entry["season"] = ep["season"]
        new_entries.append(entry)

    skipped_dup = len(all_scraped) - len(new_entries) - len(
        [e for e in all_scraped
         if e["title"] in added_titles and e["title"] not in existing_titles
         and all_scraped.index(e) > 0]  # 簡易カウント
    )
    skipped_dup = len(all_scraped) - len(new_entries)

    # ── サマリー ──
    print("\n" + "=" * 60)
    print("処理結果サマリー")
    print("=" * 60)
    print(f"  スクレイピング総数   : {len(all_scraped):4d} 件")
    print(f"  重複スキップ         : {skipped_dup:4d} 件")
    print(f"  新規追加予定         : {len(new_entries):4d} 件")
    print(f"  episodes.json 合計   : {len(episodes) + len(new_entries):4d} 件（現在: {len(episodes)}件）")

    if args.dry_run:
        print("\n[dry-run] episodes.json は変更しません")
        print("\n新規追加予定（全件）:")
        for e in new_entries:
            s = f" season={e['season']}" if e.get("season") else ""
            print(f"  [{e.get('arc','?')}{s}] {e['title']}")
        return

    # ── 保存 ──
    episodes.extend(new_entries)
    with open(EPISODES_JSON, "w", encoding="utf-8") as f:
        json.dump(episodes, f, ensure_ascii=False, indent=2)
    print(f"\n[Save] {EPISODES_JSON}")
    print("完了！")


if __name__ == "__main__":
    main()
