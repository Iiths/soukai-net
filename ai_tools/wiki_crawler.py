#!/usr/bin/env python3
"""
ニンジャスレイヤーWiki 自動クローラー v2

登場人物一覧ページ（3部まで＆4部以降）を起点に、組織→キャラクターの
順でトラバースし、src/data/ninjas.json に安全にマージする。

【設計方針】
  Phase 1: 一覧ページから組織リストを収集
  Phase 2: 各組織ページからキャラクターを収集（一覧ページに直接リストがあれば省略）
  Phase 3: キャラクター個別ページから詳細情報を補完（任意・低速）
  Merge  : 非破壊マージ（既存データを削除・上書きしない）

【マージルール】
  ・既存エントリ: null/空フィールドのみ更新。organizations/aliases は追記のみ
  ・新規エントリ: 全フィールドで追加
  ・手動編集済みデータは一切変更しない

【使い方】（soukai-net/ または ai_tools/ から実行）
  python ai_tools/wiki_crawler.py                  # 全件スキャン＋マージ
  python ai_tools/wiki_crawler.py --dry-run         # プレビューのみ（ninjas.json変更なし）
  python ai_tools/wiki_crawler.py --phase 1         # 収集のみ（reports/wiki_scraped.json に保存）
  python ai_tools/wiki_crawler.py --phase 2         # reports/wiki_scraped.json を読んでマージ
  python ai_tools/wiki_crawler.py --limit 5         # テスト: 最初の5組織のみ処理
  python ai_tools/wiki_crawler.py --no-detail       # 個別ページ詳細取得をスキップ（高速）
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
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    import subprocess
    subprocess.run(["pip", "install", "requests", "beautifulsoup4", "--break-system-packages", "-q"],
                   check=True, capture_output=True)
    import requests
    from bs4 import BeautifulSoup, NavigableString

# ============================================================
# 設定
# ============================================================

BASE_URL = "https://wikiwiki.jp"

# 起点となる2つの登場人物一覧ページ
LIST_URLS = [
    ("3部まで",   "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7"),
    ("4部以降",   "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7%EF%BC%88%E7%AC%AC4%E9%83%A8%E4%BB%A5%E9%99%8D%EF%BC%89"),
]

BASE_DIR = Path(__file__).resolve().parent.parent
NINJAS_JSON    = BASE_DIR / "src" / "data" / "ninjas.json"
REPORTS_DIR    = BASE_DIR / "reports"
SCRAPED_CACHE  = REPORTS_DIR / "wiki_scraped.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SoukaiNetCrawler/2.0; +https://github.com/NJSLYRDatabase)",
    "Accept-Language": "ja,en;q=0.9",
}
REQUEST_DELAY = 1.5  # サーバー負荷対策（1秒以上推奨）

# 組織・一覧ページとみなすURLフラグメント（個別キャラページの詳細取得をスキップ）
ORG_URL_KEYWORDS = [
    "登場人物一覧", "クラン", "ニンジャクラン", "サンズ・オブ・ケオス",
    "ソウカイヤ", "ザイバツ", "過冬", "ネザーキョウ", "ダークカラテエンパイア",
    "ハンザイ", "オムラ", "ヨロシサン", "ヌーテック", "アルカナム",
    "アマクダリ", "ヘル・プロヴィデンス", "カタナ・オブ・リバプール",
    "デルタ・シノビ", "スレイト・オブ・ニンジャ", "スズメバチの黄色",
    "リアルニンジャ一覧",
]

# ============================================================
# HTTP ユーティリティ
# ============================================================

_fetch_count = 0

def fetch(url: str, label: str = "") -> BeautifulSoup | None:
    global _fetch_count
    _fetch_count += 1
    try:
        time.sleep(REQUEST_DELAY)
        resp = requests.get(url, headers=HEADERS, timeout=25)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        return BeautifulSoup(resp.text, "html.parser")
    except requests.HTTPError as e:
        print(f"  ⚠ HTTP {e.response.status_code}: {url}")
        return None
    except Exception as e:
        print(f"  ⚠ 取得失敗{' (' + label + ')' if label else ''}: {e}")
        return None


def is_njslyr_page(href: str) -> bool:
    """wikiwiki.jp の njslyr 配下のリンクか判定"""
    return bool(href and href.startswith("/njslyr/"))


def is_character_page(href: str) -> bool:
    """組織・一覧ページでなく、個別キャラクターページと推定されるか"""
    if not is_njslyr_page(href):
        return False
    decoded = unquote(href)
    return not any(kw in decoded for kw in ORG_URL_KEYWORDS)

# ============================================================
# Phase 1: 一覧ページ解析
# ============================================================

def parse_list_page(soup: BeautifulSoup, section_label: str) -> list[dict]:
    """
    登場人物一覧ページを解析し、組織ごとのキャラクターリストを返す。

    Returns: [{name, wiki_url, org_name, section}, ...]
    """
    content = soup.find(id="content") or soup.find("div", class_="content") or soup
    entries = []
    current_org = f"未分類_{section_label}"

    def _flush_table(table, org):
        results = []
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            # ヘッダ行（th のみ）はスキップ
            if all(c.name == "th" for c in cells):
                continue

            first = cells[0]
            link = first.find("a", href=True)
            if link and is_njslyr_page(link["href"]):
                name = link.get_text(strip=True)
                if name and len(name) >= 2:
                    results.append({
                        "name": name,
                        "wiki_url": BASE_URL + link["href"],
                        "org_name": org,
                        "section": section_label,
                        "_is_org_page": not is_character_page(link["href"]),
                    })
            else:
                # リンクなし（名前テキストのみ）
                name = first.get_text(strip=True)
                # 注釈・記号・長すぎるテキストは除外
                if name and 2 <= len(name) <= 40 and not name.startswith(("※", "注", "　", "【")):
                    results.append({
                        "name": name,
                        "wiki_url": None,
                        "org_name": org,
                        "section": section_label,
                        "_is_org_page": False,
                    })
        return results

    # DOM を順番にスキャン
    for elem in content.descendants:
        tag = getattr(elem, "name", None)
        if tag is None:
            continue

        # 見出し → 組織名更新
        if tag in ("h2", "h3", "h4"):
            text = elem.get_text(strip=True)
            text = re.sub(r"[†¶ ]+$", "", text).strip()
            if text and not any(skip in text for skip in ["目次", "Contents", "編集"]):
                current_org = text

        # テーブル → キャラクター抽出
        elif tag == "table":
            entries.extend(_flush_table(elem, current_org))

    return entries


def collect_from_org_page(url: str, org_name: str) -> list[dict]:
    """組織個別ページからキャラクターリストを取得"""
    soup = fetch(url, org_name)
    if not soup:
        return []
    content = soup.find(id="content") or soup
    entries = []
    for table in content.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if not cells or all(c.name == "th" for c in cells):
                continue
            first = cells[0]
            link = first.find("a", href=True)
            if link and is_character_page(link["href"]):
                name = link.get_text(strip=True)
                if name and len(name) >= 2:
                    entries.append({
                        "name": name,
                        "wiki_url": BASE_URL + link["href"],
                        "org_name": org_name,
                    })
    return entries

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

    # ニンジャ名鑑カード
    card_m = re.search(r"ニンジャ名鑑[#＃](\d+)\s*【([^】]+)】", head)
    if card_m:
        result["_soul_name"] = card_m.group(2)

    # ソウル等級
    grade_m = re.search(r"(アーチ級|グレーター級|レッサー級)ニンジャ", head)
    if grade_m:
        result["_soul_grade"] = grade_m.group(1)
    elif card_m:
        result["_soul_grade"] = "等級不明"

    # ニンジャクラン
    clan_m = re.search(r"([^\s\n「」◆【】（）、。,\.]{2,28}・ニンジャクラン)", full_text[:1200])
    if clan_m:
        result["_soul_clan"] = clan_m.group(1)

    # ニンジャタイプ推定
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
    death_kw = ["死亡", "命を落とした", "殺される", "斃れた", "果てた", "絶命", "討たれた"]
    if any(kw in full_text[:3000] for kw in death_kw):
        result["_status"] = "dead"

    return result

# ============================================================
# マージ
# ============================================================

def normalize(name: str) -> str:
    return name.strip()


def make_id(name: str) -> str:
    safe = re.sub(r"[^\w]", "_", name)[:20]
    return f"{safe}_{uuid.uuid4().hex[:6]}"


def build_index(ninjas: list) -> dict:
    idx = {}
    for n in ninjas:
        idx[normalize(n["name"])] = n
        for a in (n.get("aliases") or []):
            idx[normalize(a)] = n
    return idx


def org_id_from_name(org_name: str) -> str:
    """組織名からIDを生成（安定したID）"""
    safe = re.sub(r"[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]", "_", org_name)
    return safe[:30].lower()


def add_org_to_ninja(ninja: dict, org_name: str):
    oid = org_id_from_name(org_name)
    orgs = ninja.setdefault("organizations", [])
    if not any(o.get("id") == oid or o.get("name") == org_name for o in orgs):
        orgs.append({"id": oid, "name": org_name})


def merge_entry(existing: dict, org_name: str, wiki_url: str | None,
                detail: dict, stats: dict):
    """既存エントリに情報を非破壊マージ"""
    # 組織追加（既存リストに追記）
    before_orgs = len(existing.get("organizations") or [])
    add_org_to_ninja(existing, org_name)
    if len(existing.get("organizations") or []) > before_orgs:
        stats["org_added"] += 1

    # wikiUrl 補完
    if not existing.get("wikiUrl") and wiki_url:
        existing["wikiUrl"] = wiki_url
        stats["url_added"] += 1

    # 詳細情報の補完（null/空フィールドのみ）
    if detail.get("_ninja_type") and not existing.get("ninjaType"):
        existing["ninjaType"] = detail["_ninja_type"]
        stats["type_added"] += 1

    if detail.get("_soul_name") and not existing.get("ninjaSoul"):
        existing["ninjaSoul"] = {
            "id": f"soul-{detail['_soul_name'][:20]}",
            "name": detail["_soul_name"],
            "grade": detail.get("_soul_grade"),
            "clan": detail.get("_soul_clan"),
        }
        stats["soul_added"] += 1

    if detail.get("_status") and not existing.get("status"):
        existing["status"] = detail["_status"]
        stats["status_added"] += 1


def create_new_entry(name: str, org_name: str, wiki_url: str | None, detail: dict) -> dict:
    """新規エントリを作成"""
    entry: dict = {
        "id": make_id(name),
        "name": name,
        "organizations": [{"id": org_id_from_name(org_name), "name": org_name}],
        "appearances": [],
    }
    if wiki_url:
        entry["wikiUrl"] = wiki_url
    if detail.get("_ninja_type"):
        entry["ninjaType"] = detail["_ninja_type"]
    if detail.get("_soul_name"):
        entry["ninjaSoul"] = {
            "id": f"soul-{detail['_soul_name'][:20]}",
            "name": detail["_soul_name"],
            "grade": detail.get("_soul_grade"),
            "clan": detail.get("_soul_clan"),
        }
    if detail.get("_status"):
        entry["status"] = detail["_status"]
    return entry

# ============================================================
# メイン処理
# ============================================================

def run_phase1(limit: int | None = None) -> list[dict]:
    """
    Phase 1: 一覧ページと組織ページをトラバースして全キャラクターを収集。
    Returns: [{name, wiki_url, org_name, section, ...}, ...]
    """
    all_entries: list[dict] = []
    visited_org_urls: set[str] = set()

    for section_label, list_url in LIST_URLS:
        print(f"\n{'='*50}")
        print(f"[Phase1] {section_label} の一覧ページを取得: {list_url}")
        soup = fetch(list_url, section_label)
        if not soup:
            print("  ⚠ 取得失敗、スキップ")
            continue

        entries = parse_list_page(soup, section_label)
        print(f"  → {len(entries)}件のエントリを発見")

        # 組織ページへのリンクは組織ページをさらにトラバース
        org_page_links = [e for e in entries if e.get("_is_org_page")]
        char_entries    = [e for e in entries if not e.get("_is_org_page")]

        print(f"    直接キャラ: {len(char_entries)}件  組織ページリンク: {len(org_page_links)}件")

        # 直接キャラエントリを追加
        all_entries.extend(char_entries)

        # 組織ページをトラバース
        org_count = 0
        for org_entry in org_page_links:
            if limit and org_count >= limit:
                print(f"  --limit {limit} に達したのでスキップ")
                break
            org_url = org_entry.get("wiki_url")
            org_name = org_entry.get("org_name", org_entry["name"])

            if not org_url or org_url in visited_org_urls:
                continue
            visited_org_urls.add(org_url)

            print(f"  [{org_count+1:3d}] 組織ページ取得: {org_name} ({org_url})")
            sub_entries = collect_from_org_page(org_url, org_name)
            print(f"       → {len(sub_entries)}件")
            all_entries.extend(sub_entries)
            org_count += 1

    # 重複除去（同名エントリは最初のものを保持、組織情報をマージ）
    print(f"\n[Phase1] 総エントリ数（重複含む）: {len(all_entries)}")
    deduped: dict[str, dict] = {}
    for e in all_entries:
        key = normalize(e["name"])
        if key not in deduped:
            deduped[key] = {**e, "_orgs": [e["org_name"]]}
        else:
            if e["org_name"] not in deduped[key]["_orgs"]:
                deduped[key]["_orgs"].append(e["org_name"])
            # wikiUrlがなければ補完
            if not deduped[key].get("wiki_url") and e.get("wiki_url"):
                deduped[key]["wiki_url"] = e["wiki_url"]

    result = list(deduped.values())
    print(f"[Phase1] 重複除去後: {len(result)}件")
    return result


def run_phase2_detail(entries: list[dict], no_detail: bool = False) -> list[dict]:
    """
    Phase 2: wiki_url があるエントリに詳細情報を補完。
    """
    if no_detail:
        print("\n[Phase2] --no-detail のためスキップ")
        for e in entries:
            e["_detail"] = {}
        return entries

    targets = [e for e in entries if e.get("wiki_url") and is_character_page(
        "/" + e["wiki_url"].replace(BASE_URL, "").lstrip("/")
    )]
    non_targets = [e for e in entries if e not in targets]

    print(f"\n[Phase2] 詳細取得対象: {len(targets)}件 / 全{len(entries)}件")
    print("  ※ 各リクエストに 1.5 秒のウェイトを挿入しています")
    print(f"  ※ 所要時間の目安: 約 {len(targets) * REQUEST_DELAY / 60:.0f}分")

    for i, entry in enumerate(targets):
        sys.stdout.write(f"\r  [{i+1}/{len(targets)}] {entry['name'][:25]:<25} ... ")
        sys.stdout.flush()
        detail = fetch_character_detail(entry["wiki_url"])
        entry["_detail"] = detail
        soul = detail.get("_soul_name", "-")
        sys.stdout.write(f"soul={soul[:12] if soul != '-' else '-':<12}\n")

    for e in non_targets:
        e["_detail"] = {}

    return entries


def run_merge(entries: list[dict], dry_run: bool = False) -> dict:
    """
    Phase 3: 収集データを ninjas.json に非破壊マージ。
    """
    print(f"\n[Merge] ninjas.json を読み込み: {NINJAS_JSON}")
    with open(NINJAS_JSON, encoding="utf-8") as f:
        ninjas: list = json.load(f)
    print(f"  → 既存: {len(ninjas)}件")

    index = build_index(ninjas)

    stats = {
        "new_added": 0,
        "org_added": 0,
        "url_added": 0,
        "type_added": 0,
        "soul_added": 0,
        "status_added": 0,
        "skipped": 0,
    }

    new_ninjas = []

    for entry in entries:
        name = normalize(entry["name"])
        org_name = entry.get("org_name", "不明")
        wiki_url = entry.get("wiki_url")
        detail = entry.get("_detail", {})

        if name in index:
            # 既存エントリにマージ
            merge_entry(index[name], org_name, wiki_url, detail, stats)
        else:
            # 新規追加
            new = create_new_entry(name, org_name, wiki_url, detail)
            new_ninjas.append(new)
            index[name] = new
            stats["new_added"] += 1

    if not dry_run:
        ninjas.extend(new_ninjas)
        with open(NINJAS_JSON, "w", encoding="utf-8") as f:
            json.dump(ninjas, f, ensure_ascii=False, indent=2)
        print(f"\n[Merge] 保存完了: {NINJAS_JSON}")
        print(f"  総キャラクター数: {len(ninjas)}件 (+{stats['new_added']}件)")
    else:
        print(f"\n[Merge] --dry-run のため ninjas.json は変更しません")
        print(f"  ※ 実際に実行すると {stats['new_added']}件 が追加されます")

    print("\n" + "=" * 50)
    print("マージ結果サマリー")
    print("=" * 50)
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
    parser = argparse.ArgumentParser(description="ニンジャスレイヤーWiki 自動クローラー")
    parser.add_argument("--dry-run", action="store_true",
                        help="ninjas.json を変更せず結果をプレビュー")
    parser.add_argument("--phase", type=int, choices=[1, 2],
                        help="1: 収集のみ(reports/に保存)  2: キャッシュからマージ")
    parser.add_argument("--limit", type=int, default=None,
                        help="処理する組織ページ数を制限（テスト用）")
    parser.add_argument("--no-detail", action="store_true",
                        help="個別ページ詳細取得をスキップ（高速・省略情報）")
    args = parser.parse_args()

    REPORTS_DIR.mkdir(exist_ok=True)

    if args.phase == 2:
        # キャッシュ読み込みモード
        if not SCRAPED_CACHE.exists():
            print(f"[ERROR] キャッシュが見つかりません: {SCRAPED_CACHE}")
            print("  まず --phase 1 を実行してください")
            return
        print(f"[Phase2] キャッシュ読み込み: {SCRAPED_CACHE}")
        with open(SCRAPED_CACHE, encoding="utf-8") as f:
            entries = json.load(f)
        print(f"  → {len(entries)}件")
        run_merge(entries, dry_run=args.dry_run)
        return

    # Phase 1: 収集
    entries = run_phase1(limit=args.limit)

    # Phase 1 のみ
    if args.phase == 1:
        with open(SCRAPED_CACHE, "w", encoding="utf-8") as f:
            # _detail フィールドは含めずに保存
            save_data = [{k: v for k, v in e.items() if k != "_detail"} for e in entries]
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        print(f"\n[Phase1] 収集データを保存: {SCRAPED_CACHE}")
        print("  続けてマージするには: python ai_tools/wiki_crawler.py --phase 2")
        return

    # Phase 2: 詳細取得（--no-detail で省略可）
    entries = run_phase2_detail(entries, no_detail=args.no_detail)

    # 収集データをキャッシュ保存（再実行時に使える）
    with open(SCRAPED_CACHE, "w", encoding="utf-8") as f:
        save_data = [{k: v for k, v in e.items() if k != "_detail"} for e in entries]
        json.dump(save_data, f, ensure_ascii=False, indent=2)

    # マージ
    run_merge(entries, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
