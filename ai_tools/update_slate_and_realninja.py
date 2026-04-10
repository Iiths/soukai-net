#!/usr/bin/env python3
"""
スレイト・オブ・ニンジャ登場人物 & リアルニンジャ一覧 スクレイピングスクリプト

【処理内容】
1. 「スレイト・オブ・ニンジャ」登場人物一覧
   - 「ニンジャ」「非ニンジャ」セクション配下のH4見出し名を登場人物として追加
   - 「名称不明ニンジャ」セクションは除外
   - 個別ページ確認は省略（大半がページなし）
   - エピソード「スレイト・オブ・ニンジャ」を episodes.json に追加（なければ新規作成）し、
     全キャラクターの appearances に紐づける

2. リアルニンジャ一覧
   - 「個別ページのあるリアルニンジャ一覧」セクション配下のリンクのみ対象
   - 個別ページを確認（wikiUrl / 名前でマッチング）
   - 既存エントリ: リストに記載された名前を別名（aliases）に追加
   - 新規エントリ: 追加

【使い方】（soukai-net/ から実行）
  python ai_tools/update_slate_and_realninja.py            # 通常実行
  python ai_tools/update_slate_and_realninja.py --dry-run  # 確認のみ（JSON変更なし）
"""

import argparse
import json
import re
import time
import uuid
from pathlib import Path
from urllib.parse import unquote

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

BASE_URL = "https://wikiwiki.jp"

SLATE_URL = (
    "https://wikiwiki.jp/njslyr/"
    "%E3%80%8C%E3%82%B9%E3%83%AC%E3%82%A4%E3%83%88%E3%83%BB%E3%82%AA%E3%83%96%E3%83%BB"
    "%E3%83%8B%E3%83%B3%E3%82%B8%E3%83%A3%E3%80%8D%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7"
)
REAL_NINJA_URL = "https://wikiwiki.jp/njslyr/%E3%83%AA%E3%82%A2%E3%83%AB%E3%83%8B%E3%83%B3%E3%82%B8%E3%83%A3%E4%B8%80%E8%A6%A7"

SLATE_EPISODE_TITLE = "スレイト・オブ・ニンジャ"

BASE_DIR = Path(__file__).resolve().parent.parent
NINJAS_JSON = BASE_DIR / "src" / "data" / "ninjas.json"
EPISODES_JSON = BASE_DIR / "src" / "data" / "episodes.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SoukaiNetCrawler/3.0)",
    "Accept-Language": "ja,en;q=0.9",
}
REQUEST_DELAY = 1.5

# ============================================================
# HTTP ユーティリティ
# ============================================================

def fetch(url: str, label: str = "") -> "BeautifulSoup | None":
    try:
        time.sleep(REQUEST_DELAY)
        resp = requests.get(url, headers=HEADERS, timeout=25)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        return BeautifulSoup(resp.text, "html.parser")
    except requests.HTTPError as e:
        code = e.response.status_code if e.response else "?"
        print(f"  ⚠ HTTP {code}: {url}")
        return None
    except Exception as e:
        lbl = f" ({label})" if label else ""
        print(f"  ⚠ 取得失敗{lbl}: {e}")
        return None


def is_char_link(href: str) -> bool:
    """キャラクター個別ページのリンクか判定（::cmd / 設定ページ等を除外）"""
    if not href or not href.startswith("/njslyr/"):
        return False
    decoded = unquote(href)
    # 編集リンク
    if "::cmd" in decoded:
        return False
    # 設定ページ・アンカーのみ
    page = decoded[len("/njslyr/"):].split("#")[0]
    SKIP_PAGES = {
        "ニンジャについて", "地名", "武器", "生物", "ジツ", "コトダマ空間",
        "ニンジャクラン一覧", "リアルニンジャ一覧", "登場人物一覧",
        "ニンジャスレイヤープラス", "アルカナム・コンプレックス社",
    }
    if page in SKIP_PAGES:
        return False
    if not page:
        return False
    return True


# ============================================================
# ユーティリティ
# ============================================================

def make_id() -> str:
    return uuid.uuid4().hex[:8]


def build_index(ninjas: list) -> dict:
    """名前・aliases・wikiUrl でルックアップできるインデックスを生成"""
    idx_name: dict[str, dict] = {}
    idx_url: dict[str, dict] = {}
    for n in ninjas:
        idx_name[n["name"]] = n
        for a in (n.get("aliases") or []):
            idx_name[a] = n
        url = n.get("wikiUrl", "")
        if url:
            idx_url[url] = n
    return idx_name, idx_url


def add_alias(ninja: dict, alias: str, stats: dict):
    """alias が未登録なら追加"""
    if alias == ninja["name"]:
        return
    existing = set(ninja.get("aliases") or [])
    if alias not in existing:
        ninja.setdefault("aliases", []).append(alias)
        stats["alias_added"] += 1
        print(f"    → 別名追加: {ninja['name']} ← {alias}")


def add_appearance(ninja: dict, episode_id: str, stats: dict):
    """appearances に episode_id が未登録なら追加"""
    apps = ninja.setdefault("appearances", [])
    if not any(a.get("id") == episode_id for a in apps):
        apps.append({"id": episode_id})
        stats["appearance_added"] += 1


def ensure_episode(episodes: list, title: str) -> str:
    """episodes リストに title のエピソードがなければ追加して ID を返す"""
    for ep in episodes:
        if ep.get("title") == title:
            print(f"  エピソード既存: {title} (id={ep['id']})")
            return ep["id"]
    new_id = make_id()
    episodes.append({"id": new_id, "title": title})
    print(f"  エピソード新規追加: {title} (id={new_id})")
    return new_id


# ============================================================
# Part 1: スレイト・オブ・ニンジャ登場人物一覧
# ============================================================

def parse_slate_chars(soup: BeautifulSoup) -> list[str]:
    """
    「ニンジャ」「非ニンジャ」セクション配下の H4 見出し名を収集。
    「名称不明ニンジャ」セクションは除外。
    """
    content = soup.find(id="content")
    if not content:
        print("  ⚠ id='content' が見つかりません")
        return []

    chars = []
    in_target_section = False

    headings = content.find_all(["h2", "h3", "h4"])
    for h in headings:
        text = h.get_text(strip=True)
        if h.name in ("h2", "h3"):
            # セクション切り替え
            if text in ("ニンジャ", "非ニンジャ"):
                in_target_section = True
            else:
                in_target_section = False
        elif h.name == "h4" and in_target_section:
            name = text.strip()
            # 装飾記号除去
            name = re.sub(r"[◆†¶]+", "", name).strip()
            if name and len(name) >= 2:
                chars.append(name)

    return chars


def process_slate(ninjas: list, idx_name: dict, idx_url: dict,
                  episode_id: str, stats: dict):
    """スレイト・オブ・ニンジャ登場人物を処理"""
    print(f"\n[Slate] ページ取得: {SLATE_URL}")
    soup = fetch(SLATE_URL, "スレイト登場人物一覧")
    if not soup:
        print("  ⚠ 取得失敗")
        return

    chars = parse_slate_chars(soup)
    print(f"  → {len(chars)}件のキャラクター取得（ニンジャ＋非ニンジャ）")

    for name in chars:
        if name in idx_name:
            # 既存エントリにエピソードを追加
            ninja = idx_name[name]
            add_appearance(ninja, episode_id, stats)
        else:
            # 新規追加
            new: dict = {
                "id": make_id(),
                "name": name,
                "organizations": [],
                "appearances": [{"id": episode_id}],
            }
            ninjas.append(new)
            idx_name[name] = new
            stats["new_added"] += 1
            print(f"    → 新規追加: {name}")

    print(f"  [Slate] 新規={stats['new_added']}件  出演追加={stats['appearance_added']}件")


# ============================================================
# Part 2: リアルニンジャ一覧（個別ページのあるもののみ）
# ============================================================

def parse_real_ninja_links(soup: BeautifulSoup) -> list[dict]:
    """
    「個別ページのあるリアルニンジャ一覧」セクション配下のキャラクターリンクを収集。
    Returns: [{wiki_url, page_name, list_name}, ...]
      - wiki_url : キャラクター個別ページの URL
      - page_name: リンクの title 属性（Wikiページのタイトル = 正規名称）
      - list_name: リンクのテキスト（リアルニンジャ一覧に記載された名称）
    """
    content = soup.find(id="content")
    if not content:
        return []

    # 「個別ページのあるリアルニンジャ一覧」H3 を検索
    target_h3 = None
    for h in content.find_all("h3"):
        if "個別ページのある" in h.get_text():
            target_h3 = h
            break

    if not target_h3:
        print("  ⚠ 「個別ページのあるリアルニンジャ一覧」セクションが見つかりません")
        return []

    links = []
    seen_urls = set()

    # H3 から次の H3 までの兄弟要素を走査
    for sib in target_h3.find_next_siblings():
        if sib.name == "h3":
            break
        # リンクを抽出
        for a in sib.find_all("a", href=True):
            href = a.get("href", "")
            if not is_char_link(href):
                continue
            base_href = href.split("#")[0]
            wiki_url = BASE_URL + base_href
            if wiki_url in seen_urls:
                continue
            seen_urls.add(wiki_url)

            page_name = a.get("title", "").strip()
            list_name = a.get_text(strip=True)

            # テキストが空 / 記号のみはスキップ
            if not list_name or len(list_name) < 2:
                continue
            # page_name が取れなければ list_name で代替
            if not page_name:
                page_name = list_name

            links.append({
                "wiki_url": wiki_url,
                "page_name": page_name,
                "list_name": list_name,
            })

    return links


def process_real_ninja(ninjas: list, idx_name: dict, idx_url: dict, stats: dict):
    """リアルニンジャ一覧（個別ページあり）を処理"""
    print(f"\n[RealNinja] ページ取得: {REAL_NINJA_URL}")
    soup = fetch(REAL_NINJA_URL, "リアルニンジャ一覧")
    if not soup:
        print("  ⚠ 取得失敗")
        return

    links = parse_real_ninja_links(soup)
    print(f"  → {len(links)}件のキャラクターリンク取得")

    for entry in links:
        wiki_url = entry["wiki_url"]
        page_name = entry["page_name"]
        list_name = entry["list_name"]

        # 既存エントリを探す: wikiUrl → page_name → list_name の順
        found = idx_url.get(wiki_url)
        if not found:
            found = idx_name.get(page_name)
        if not found:
            found = idx_name.get(list_name)

        if found:
            # 既存エントリへの別名追加
            # list_name が正規名称や既存エイリアスでなければ追加
            add_alias(found, list_name, stats)
            # page_name もエイリアスに（list_name と異なる場合）
            if page_name != list_name:
                add_alias(found, page_name, stats)
            # wikiUrl が未設定なら補完
            if not found.get("wikiUrl"):
                found["wikiUrl"] = wiki_url
                stats["url_added"] += 1
        else:
            # 新規追加
            new: dict = {
                "id": make_id(),
                "name": page_name,
                "ninjaType": "リアルニンジャ",
                "organizations": [],
                "appearances": [],
                "wikiUrl": wiki_url,
            }
            if list_name != page_name:
                new["aliases"] = [list_name]
            ninjas.append(new)
            idx_name[page_name] = new
            idx_name[list_name] = new
            idx_url[wiki_url] = new
            stats["new_added"] += 1
            print(f"    → 新規追加: {page_name}"
                  + (f" (別名: {list_name})" if list_name != page_name else ""))

    print(f"  [RealNinja] 新規={stats['new_added']}件  別名追加={stats['alias_added']}件")


# ============================================================
# メイン
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="スレイト・オブ・ニンジャ & リアルニンジャ一覧 スクレイピング"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="JSON ファイルを変更せずに処理内容を確認")
    parser.add_argument("--slate-only", action="store_true",
                        help="スレイト・オブ・ニンジャのみ処理")
    parser.add_argument("--realninja-only", action="store_true",
                        help="リアルニンジャ一覧のみ処理")
    args = parser.parse_args()

    # JSON 読み込み
    print(f"[Load] {NINJAS_JSON}")
    with open(NINJAS_JSON, encoding="utf-8") as f:
        ninjas: list = json.load(f)
    print(f"  既存ニンジャ: {len(ninjas)}件")

    print(f"[Load] {EPISODES_JSON}")
    with open(EPISODES_JSON, encoding="utf-8") as f:
        episodes: list = json.load(f)
    print(f"  既存エピソード: {len(episodes)}件")

    idx_name, idx_url = build_index(ninjas)

    stats = dict(
        new_added=0,
        alias_added=0,
        appearance_added=0,
        url_added=0,
    )

    run_slate = not args.realninja_only
    run_real = not args.slate_only

    # ── Part 1: スレイト・オブ・ニンジャ ──
    if run_slate:
        print("\n" + "=" * 60)
        print("Part 1: スレイト・オブ・ニンジャ 登場人物一覧")
        print("=" * 60)

        slate_stats = dict(new_added=0, appearance_added=0)
        tmp_stats = dict(new_added=0, alias_added=0, appearance_added=0, url_added=0)

        # エピソード確認/追加
        episode_id = ensure_episode(episodes, SLATE_EPISODE_TITLE)

        process_slate(ninjas, idx_name, idx_url, episode_id, tmp_stats)
        for k in stats:
            stats[k] += tmp_stats[k]

    # ── Part 2: リアルニンジャ一覧 ──
    if run_real:
        print("\n" + "=" * 60)
        print("Part 2: リアルニンジャ一覧（個別ページあり）")
        print("=" * 60)

        # 統計を一時的にリセットして表示用に再計算
        tmp2_stats = dict(new_added=0, alias_added=0, appearance_added=0, url_added=0)
        process_real_ninja(ninjas, idx_name, idx_url, tmp2_stats)
        for k in stats:
            stats[k] += tmp2_stats[k]

    # ── サマリー ──
    print("\n" + "=" * 60)
    print("処理結果サマリー")
    print("=" * 60)
    print(f"  新規追加 (ニンジャ)  : {stats['new_added']:4d} 件")
    print(f"  別名追加             : {stats['alias_added']:4d} 件")
    print(f"  出演情報追加         : {stats['appearance_added']:4d} 件")
    print(f"  wikiUrl 補完         : {stats['url_added']:4d} 件")
    print(f"  ninjas.json 合計     : {len(ninjas):4d} 件")
    print(f"  episodes.json 合計   : {len(episodes):4d} 件")

    # ── 保存 ──
    if args.dry_run:
        print("\n[dry-run] JSON ファイルは変更しません")
        return

    with open(NINJAS_JSON, "w", encoding="utf-8") as f:
        json.dump(ninjas, f, ensure_ascii=False, indent=2)
    print(f"\n[Save] {NINJAS_JSON}")

    with open(EPISODES_JSON, "w", encoding="utf-8") as f:
        json.dump(episodes, f, ensure_ascii=False, indent=2)
    print(f"[Save] {EPISODES_JSON}")

    print("\n完了！")


if __name__ == "__main__":
    main()
