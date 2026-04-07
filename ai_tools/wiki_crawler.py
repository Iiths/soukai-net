#!/usr/bin/env python3
"""
ニンジャスレイヤーWiki 自動クローラー v3

登場人物一覧ページ（3部まで & 4部以降）を起点に自動トラバースし、
src/data/ninjas.json に安全にマージする。

【Wikiページ構造（実測）】
  - テーブルは使われていない
  - キャラクターリンクは <ul class="list2"> の中の <a title="名前"> に格納
  - 大組織(ソウカイヤ等): H2/H3見出し → <p>組織ページ参照リンク</p> → 組織ページをトラバース
  - 小組織(その他): H3見出し → <ul class="list1"> → <ul class="list2"> → キャラリンク

【マージルール（非破壊）】
  - 既存エントリ: null/空フィールドのみ更新、organizations/aliasesは追記のみ
  - 新規エントリ: 全フィールドで追加
  - 手動編集済みデータは一切削除・上書きしない

【使い方】（soukai-net/ から実行）
  python ai_tools/wiki_crawler.py                  # 全件スキャン＋マージ
  python ai_tools/wiki_crawler.py --dry-run         # プレビューのみ（ninjas.json変更なし）
  python ai_tools/wiki_crawler.py --phase 1         # 収集のみ → reports/wiki_scraped.json
  python ai_tools/wiki_crawler.py --phase 2         # キャッシュからマージ
  python ai_tools/wiki_crawler.py --limit 5         # テスト: 最初の5組織ページのみ
  python ai_tools/wiki_crawler.py --no-detail       # 個別ページ詳細取得スキップ（高速）
"""

import argparse
import json
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import unquote

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.run(["pip", "install", "requests", "beautifulsoup4", "--break-system-packages", "-q"],
                   check=True, capture_output=True)
    import requests
    from bs4 import BeautifulSoup

# ============================================================
# 設定
# ============================================================

BASE_URL = "https://wikiwiki.jp"

LIST_URLS = [
    ("3部まで",  "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7"),
    ("4部以降",  "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7%EF%BC%88%E7%AC%AC4%E9%83%A8%E4%BB%A5%E9%99%8D%EF%BC%89"),
]

BASE_DIR     = Path(__file__).resolve().parent.parent
NINJAS_JSON  = BASE_DIR / "src" / "data" / "ninjas.json"
REPORTS_DIR  = BASE_DIR / "reports"
SCRAPED_CACHE = REPORTS_DIR / "wiki_scraped.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SoukaiNetCrawler/3.0)",
    "Accept-Language": "ja,en;q=0.9",
}
REQUEST_DELAY = 1.5  # サーバー負荷対策（秒）

# 個別キャラページでない（組織・一覧ページ等）と判定するキーワード
ORG_URL_KEYWORDS = [
    "登場人物一覧", "クラン一覧", "リアルニンジャ一覧",
    "::cmd",        # Wiki編集リンク
]

# 見出しの link.title としてよく現れるが、組織名ではないもの
NON_ORG_TITLES = {"地名", "ニンジャクラン一覧", "翻訳チーム", ""}

_fetch_count = 0

# ============================================================
# HTTP ユーティリティ
# ============================================================

def fetch(url: str, label: str = "") -> "BeautifulSoup | None":
    global _fetch_count
    _fetch_count += 1
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
    """キャラクター個別ページのリンクか（組織・一覧・編集リンクを除外）"""
    if not href or not href.startswith("/njslyr/"):
        return False
    return not any(kw in href for kw in ORG_URL_KEYWORDS)


# ============================================================
# 見出しテキスト抽出ユーティリティ
# ============================================================

def org_name_from_heading(el) -> str:
    """
    H2/H3/H4 見出し要素から組織名を取得。
    優先順位:
      1. リンク内の title 属性（ただし NON_ORG_TITLES に含まれるものは除外）
         かつ href が「登場人物一覧」への自己参照でないもの
      2. 見出しテキスト全体（◆ や †¶ などを除去）
    """
    for a in el.find_all("a", href=True):
        href = a.get("href", "")
        if not href.startswith("/njslyr/"):
            continue
        # 自己参照アンカー（同ページ内アンカー）は除外
        decoded = unquote(href)
        if "登場人物一覧" in decoded:
            continue
        title = a.get("title", "").strip()
        if title and title not in NON_ORG_TITLES:
            return title

    # fallback: 見出しテキストをクリーニング
    raw = el.get_text(strip=True)
    raw = re.sub(r"[◆†¶]+", "", raw)   # 装飾記号除去
    raw = re.sub(r"\s+", " ", raw)
    return raw.strip()


# ============================================================
# Phase 1: 一覧ページ解析
# ============================================================

def parse_list_page(soup: BeautifulSoup, section_label: str) -> list[dict]:
    """
    登場人物一覧ページを解析。

    Returns:
        [
          {
            'org_name': str,
            'org_ref':  str | None,   # 組織個別ページURL（ある場合）
            'chars':    [{name, wiki_url}, ...],  # 直接リストされているキャラ
            'section':  str,
          },
          ...
        ]
    """
    content = soup.find(id="content")
    if not content:
        print("  ⚠ id='content' 要素が見つかりません")
        return []

    sections: list[dict] = []
    current: dict | None = None

    SKIP_ORG_NAMES = {"目次", "Contents", "編集", "翻訳チームによるニンジャ名鑑", ""}

    for el in content.children:
        tag = getattr(el, "name", None)
        if not tag:
            continue

        # ── 見出し → 組織セクション開始 ──
        if tag in ("h2", "h3", "h4"):
            org_name = org_name_from_heading(el)
            if org_name in SKIP_ORG_NAMES or len(org_name) < 2:
                current = None
                continue
            current = {
                "org_name": org_name,
                "org_ref":  None,
                "chars":    [],
                "section":  section_label,
            }
            sections.append(current)

        elif current is None:
            continue

        # ── <p> → 組織ページへの参照リンクを探す ──
        elif tag == "p":
            for a in el.find_all("a", href=True):
                href = a.get("href", "")
                if not href.startswith("/njslyr/"):
                    continue
                decoded = unquote(href)
                # 登場人物一覧ページへの自己参照は除外
                if "登場人物一覧" in decoded or "::cmd" in decoded:
                    continue
                # アンカー部分を除去してURLを取得
                base_href = href.split("#")[0]
                current["org_ref"] = BASE_URL + base_href
                break  # 最初の有効なリンクのみ使用

        # ── <ul> → ul.list2 内のキャラクターリンクを抽出 ──
        elif tag == "ul":
            _extract_chars_from_ul(el, current["chars"])

    return sections


def _extract_chars_from_ul(ul_el, out_list: list):
    """ul.list1 / ul.list2 からキャラクターリンクを抽出して out_list に追加"""
    seen_in_block = set()
    # ul.list2 の中の <a> を全取得
    for list2 in ul_el.find_all("ul", class_="list2"):
        for a in list2.find_all("a", href=True):
            href = a.get("href", "")
            if not is_char_link(href):
                continue
            base_href = href.split("#")[0]
            name = a.get("title", "").strip() or a.get_text(strip=True)
            if not name or len(name) < 2:
                continue
            key = name + base_href
            if key in seen_in_block:
                continue
            seen_in_block.add(key)
            out_list.append({
                "name":     name,
                "wiki_url": BASE_URL + base_href,
            })


# ============================================================
# Phase 1b: 組織ページ解析
# ============================================================

def parse_org_page(soup: BeautifulSoup, org_name: str) -> list[dict]:
    """
    組織個別ページから全構成員を抽出（ul.list2 パターン）。
    """
    content = soup.find(id="content")
    if not content:
        return []

    chars = []
    seen = set()

    for ul in content.find_all("ul", class_="list2"):
        for a in ul.find_all("a", href=True):
            href = a.get("href", "")
            if not is_char_link(href):
                continue
            base_href = href.split("#")[0]
            name = a.get("title", "").strip() or a.get_text(strip=True)
            if not name or len(name) < 2:
                continue
            key = name
            if key in seen:
                continue
            seen.add(key)
            chars.append({
                "name":     name,
                "wiki_url": BASE_URL + base_href,
                "org_name": org_name,
            })

    return chars


# ============================================================
# Phase 2: キャラクター個別ページ詳細取得
# ============================================================

def fetch_character_detail(url: str) -> dict:
    """個別ページからニンジャソウル・タイプ・ステータスを抽出"""
    soup = fetch(url)
    if not soup:
        return {}
    content = soup.find(id="content")
    if not content:
        return {}

    result = {}
    full_text = content.get_text("\n")
    head = full_text[:800]

    # ニンジャ名鑑カード（ソウル名・等級）
    card_m = re.search(r"ニンジャ名鑑[#＃](\d+)\s*【([^】]+)】", head)
    if card_m:
        result["_soul_name"] = card_m.group(2)
        grade_m = re.search(r"(アーチ級|グレーター級|レッサー級)ニンジャ", head)
        result["_soul_grade"] = grade_m.group(1) if grade_m else "等級不明"

    # ニンジャクラン
    clan_m = re.search(r"([^\s\n「」◆【】（）、。,\.]{2,28}・ニンジャクラン)", full_text[:1200])
    if clan_m:
        result["_soul_clan"] = clan_m.group(1)

    # ニンジャタイプ推定（優先順）
    if card_m:
        result["_ninja_type"] = "ニンジャソウル憑依者"
    elif re.search(r"ニンジャソウル.{0,20}(憑依|宿|憑い)", head):
        result["_ninja_type"] = "ニンジャソウル憑依者"
    elif "リアルニンジャ" in head[:300]:
        result["_ninja_type"] = "リアルニンジャ"
    elif re.search(r"ロボ・?ニンジャ", head[:300]):
        result["_ninja_type"] = "ロボ・ニンジャ"
    elif "バイオニンジャ" in head[:300]:
        result["_ninja_type"] = "バイオニンジャ"

    # 生死ステータス
    if any(kw in full_text[:3000] for kw in ["死亡", "命を落とした", "殺される", "斃れた", "果てた", "絶命"]):
        result["_status"] = "dead"

    return result


# ============================================================
# マージユーティリティ
# ============================================================

def normalize(name: str) -> str:
    return name.strip()


def make_id(name: str) -> str:
    safe = re.sub(r"[^\w]", "_", name)[:20]
    return f"{safe}_{uuid.uuid4().hex[:6]}"


def org_id_from_name(org_name: str) -> str:
    return re.sub(r"[^\w\u3040-\u9fff]", "_", org_name)[:30].strip("_").lower()


def build_index(ninjas: list) -> dict:
    idx = {}
    for n in ninjas:
        idx[normalize(n["name"])] = n
        for a in (n.get("aliases") or []):
            idx[normalize(a)] = n
    return idx


def add_org(ninja: dict, org_name: str):
    oid = org_id_from_name(org_name)
    orgs = ninja.setdefault("organizations", [])
    if not any(o.get("id") == oid or o.get("name") == org_name for o in orgs):
        orgs.append({"id": oid, "name": org_name})


def merge_entry(existing: dict, org_name: str, wiki_url: "str | None",
                detail: dict, stats: dict):
    before = len(existing.get("organizations") or [])
    add_org(existing, org_name)
    if len(existing.get("organizations") or []) > before:
        stats["org_added"] += 1

    if not existing.get("wikiUrl") and wiki_url:
        existing["wikiUrl"] = wiki_url
        stats["url_added"] += 1

    if detail.get("_ninja_type") and not existing.get("ninjaType"):
        existing["ninjaType"] = detail["_ninja_type"]
        stats["type_added"] += 1

    if detail.get("_soul_name") and not existing.get("ninjaSoul"):
        existing["ninjaSoul"] = {
            "id":    f"soul-{detail['_soul_name'][:20]}",
            "name":  detail["_soul_name"],
            "grade": detail.get("_soul_grade"),
            "clan":  detail.get("_soul_clan"),
        }
        stats["soul_added"] += 1

    if detail.get("_status") and not existing.get("status"):
        existing["status"] = detail["_status"]
        stats["status_added"] += 1


def create_new_entry(name: str, org_name: str, wiki_url: "str | None", detail: dict) -> dict:
    entry: dict = {
        "id":            make_id(name),
        "name":          name,
        "organizations": [{"id": org_id_from_name(org_name), "name": org_name}],
        "appearances":   [],
    }
    if wiki_url:
        entry["wikiUrl"] = wiki_url
    if detail.get("_ninja_type"):
        entry["ninjaType"] = detail["_ninja_type"]
    if detail.get("_soul_name"):
        entry["ninjaSoul"] = {
            "id":    f"soul-{detail['_soul_name'][:20]}",
            "name":  detail["_soul_name"],
            "grade": detail.get("_soul_grade"),
            "clan":  detail.get("_soul_clan"),
        }
    if detail.get("_status"):
        entry["status"] = detail["_status"]
    return entry


# ============================================================
# Phase 1 メイン: トラバース実行
# ============================================================

def run_phase1(limit: "int | None" = None) -> list[dict]:
    """
    一覧ページ → 組織ページをトラバースして全キャラクターエントリを収集。
    Returns: [{name, wiki_url, org_name, section, _orgs}, ...]
    """
    all_entries: list[dict] = []
    visited_org_urls: set[str] = set()

    for section_label, list_url in LIST_URLS:
        print(f"\n{'='*55}")
        print(f"[Phase1] {section_label}: {list_url}")
        soup = fetch(list_url, section_label)
        if not soup:
            print("  ⚠ 取得失敗、スキップ")
            continue

        sections = parse_list_page(soup, section_label)
        print(f"  → {len(sections)}セクション発見")

        org_count = 0
        for sec in sections:
            org_name = sec["org_name"]

            if sec["org_ref"]:
                # ── 組織ページをたどる ──
                if limit is not None and org_count >= limit:
                    print(f"  ⚠ --limit {limit} に達したのでスキップ: {org_name}")
                    continue

                url = sec["org_ref"]
                if url in visited_org_urls:
                    print(f"  [skip] {org_name} (既訪)")
                    continue
                visited_org_urls.add(url)

                print(f"  [{org_count+1:3d}] 組織ページ: {org_name}")
                print(f"        URL: {url}")
                org_soup = fetch(url, org_name)
                if org_soup:
                    chars = parse_org_page(org_soup, org_name)
                    print(f"        → {len(chars)}件取得")
                    all_entries.extend(chars)
                org_count += 1

            elif sec["chars"]:
                # ── 一覧ページ内に直接リスト ──
                print(f"  [直接] {org_name}: {len(sec['chars'])}件")
                for c in sec["chars"]:
                    all_entries.append({
                        "name":     c["name"],
                        "wiki_url": c.get("wiki_url"),
                        "org_name": org_name,
                        "section":  section_label,
                    })

    # ── 重複除去（名前ベース）・複数所属は _orgs にまとめる ──
    deduped: dict[str, dict] = {}
    for e in all_entries:
        key = normalize(e["name"])
        if key not in deduped:
            deduped[key] = {**e, "_orgs": [e["org_name"]]}
        else:
            if e["org_name"] not in deduped[key]["_orgs"]:
                deduped[key]["_orgs"].append(e["org_name"])
            if not deduped[key].get("wiki_url") and e.get("wiki_url"):
                deduped[key]["wiki_url"] = e["wiki_url"]

    result = list(deduped.values())
    print(f"\n[Phase1] 完了: {len(all_entries)}件（重複除去後: {len(result)}件）")
    return result


# ============================================================
# Phase 2: 詳細取得
# ============================================================

def run_phase2_detail(entries: list[dict], no_detail: bool = False) -> list[dict]:
    if no_detail:
        print("\n[Phase2] --no-detail のためスキップ")
        for e in entries:
            e.setdefault("_detail", {})
        return entries

    # wiki_url ごとに詳細をキャッシュして重複リクエストを避ける
    url_to_detail: dict[str, dict] = {}
    targets = [e for e in entries if e.get("wiki_url") and is_char_link(
        "/" + e["wiki_url"].replace(BASE_URL, "").lstrip("/")
    )]

    print(f"\n[Phase2] 詳細取得: {len(targets)}件")
    est_min = len(targets) * REQUEST_DELAY / 60
    print(f"  ※ 目安: 約 {est_min:.0f}分")

    for i, entry in enumerate(targets):
        url = entry["wiki_url"]
        if url in url_to_detail:
            entry["_detail"] = url_to_detail[url]
            continue
        sys.stdout.write(f"\r  [{i+1}/{len(targets)}] {entry['name'][:22]:<22} ... ")
        sys.stdout.flush()
        detail = fetch_character_detail(url)
        url_to_detail[url] = detail
        entry["_detail"] = detail
        soul = detail.get("_soul_name", "-")
        sys.stdout.write(f"soul={soul[:12]:<12}\n")

    for e in entries:
        e.setdefault("_detail", {})

    return entries


# ============================================================
# Phase 3: マージ
# ============================================================

def run_merge(entries: list[dict], dry_run: bool = False) -> dict:
    print(f"\n[Merge] ninjas.json 読み込み: {NINJAS_JSON}")
    with open(NINJAS_JSON, encoding="utf-8") as f:
        ninjas: list = json.load(f)
    print(f"  → 既存: {len(ninjas)}件")

    index = build_index(ninjas)
    stats = dict(new_added=0, org_added=0, url_added=0,
                 type_added=0, soul_added=0, status_added=0)
    new_ninjas = []

    for entry in entries:
        name    = normalize(entry["name"])
        detail  = entry.get("_detail", {})
        wiki_url = entry.get("wiki_url")
        # _orgs がある場合は全所属を処理、なければ org_name を使用
        orgs = entry.get("_orgs") or [entry.get("org_name", "不明")]

        if name in index:
            for org in orgs:
                merge_entry(index[name], org, wiki_url, detail, stats)
        else:
            new = create_new_entry(name, orgs[0], wiki_url, detail)
            # 複数所属がある場合は追加
            for org in orgs[1:]:
                add_org(new, org)
            new_ninjas.append(new)
            index[name] = new
            stats["new_added"] += 1

    if not dry_run:
        ninjas.extend(new_ninjas)
        with open(NINJAS_JSON, "w", encoding="utf-8") as f:
            json.dump(ninjas, f, ensure_ascii=False, indent=2)
        print(f"\n[Merge] 保存完了: {len(ninjas)}件（+{stats['new_added']}件追加）")
    else:
        print(f"\n[Merge] --dry-run: ninjas.json は変更しません")
        print(f"  ※ 実行すると {stats['new_added']}件 が新規追加されます")

    print("\n" + "="*55)
    print("マージ結果サマリー")
    print("="*55)
    print(f"  新規追加          : {stats['new_added']:4d} 件")
    print(f"  組織情報追加      : {stats['org_added']:4d} 件（既存エントリへ）")
    print(f"  wikiUrl補完       : {stats['url_added']:4d} 件")
    print(f"  ninjaType補完     : {stats['type_added']:4d} 件")
    print(f"  ninjaSoul補完     : {stats['soul_added']:4d} 件")
    print(f"  status補完        : {stats['status_added']:4d} 件")
    print(f"  合計リクエスト数  : {_fetch_count:4d} 回")
    return stats


# ============================================================
# エントリポイント
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="ニンジャスレイヤーWiki 自動クローラー v3")
    parser.add_argument("--dry-run",   action="store_true", help="ninjas.json を変更せずプレビュー")
    parser.add_argument("--phase",     type=int, choices=[1, 2],
                        help="1: 収集のみ(reports/に保存)  2: キャッシュからマージ")
    parser.add_argument("--limit",     type=int, default=None,
                        help="処理する組織ページ数を制限（テスト用）")
    parser.add_argument("--no-detail", action="store_true",
                        help="個別ページ詳細取得をスキップ（高速モード）")
    args = parser.parse_args()

    REPORTS_DIR.mkdir(exist_ok=True)

    # ── キャッシュからマージモード ──
    if args.phase == 2:
        if not SCRAPED_CACHE.exists():
            print(f"[ERROR] キャッシュなし: {SCRAPED_CACHE}")
            print("  まず --phase 1 を実行してください")
            return
        with open(SCRAPED_CACHE, encoding="utf-8") as f:
            entries = json.load(f)
        print(f"[Phase2] キャッシュ読み込み: {len(entries)}件 ({SCRAPED_CACHE})")
        run_merge(entries, dry_run=args.dry_run)
        return

    # ── Phase1: 収集 ──
    entries = run_phase1(limit=args.limit)

    if args.phase == 1:
        save = [{k: v for k, v in e.items() if k != "_detail"} for e in entries]
        with open(SCRAPED_CACHE, "w", encoding="utf-8") as f:
            json.dump(save, f, ensure_ascii=False, indent=2)
        print(f"\n[Phase1] 収集データ保存: {SCRAPED_CACHE}")
        print("  続けてマージ: python ai_tools/wiki_crawler.py --phase 2")
        return

    # ── Phase2: 詳細取得 ──
    entries = run_phase2_detail(entries, no_detail=args.no_detail)

    # 収集データキャッシュ保存
    save = [{k: v for k, v in e.items() if k != "_detail"} for e in entries]
    with open(SCRAPED_CACHE, "w", encoding="utf-8") as f:
        json.dump(save, f, ensure_ascii=False, indent=2)

    # ── マージ ──
    run_merge(entries, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
