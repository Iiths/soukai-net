"""
update_appearances_from_episodes.py

エピソード一覧ページをスクレイピングし、指定キャラクターの
ninjas.json appearances を自動更新するスクリプト。

使い方:
    # Phase1: エピソード登場人物を収集してキャッシュに保存（中断・再開可）
    python ai_tools/update_appearances_from_episodes.py --phase 1

    # Phase1 テスト用: 各部から最初の3件のみ
    python ai_tools/update_appearances_from_episodes.py --phase 1 --limit 3

    # Phase2: キャッシュを元に ninjas.json を更新（dry-run）
    python ai_tools/update_appearances_from_episodes.py --phase 2 --dry-run

    # Phase2: 本番更新
    python ai_tools/update_appearances_from_episodes.py --phase 2

    # Phase3: appearances をソート（dry-run）
    python ai_tools/update_appearances_from_episodes.py --phase 3 --dry-run

    # Phase3: 本番ソート
    python ai_tools/update_appearances_from_episodes.py --phase 3

wiki 表示名と ninjas.json エントリの対応:
    ・ニンジャスレイヤー (ninjas.json name, realName=マスラダ・カイ)
        第4部: wiki「ニンジャスレイヤー」「マスラダ・カイ」
    ・サツバツナイト (ninjas.json name, realName=フジキド・ケンジ)
        全部: wiki「サツバツナイト」「フジキド・ケンジ」
        第1〜3部・外伝: wiki「ニンジャスレイヤー」も収集対象
    ・ナラク・ニンジャ: 全部 wiki「ナラク・ニンジャ」
    ・ナンシー・リー: 全部 wiki「ナンシー・リン」(「ナンシー・リー」も探索)
    ・タキ: 全部 wiki「タキ」
    ・コトブキ: 全部 wiki「コトブキ」

キャッシュファイル:
    ai_tools/cache_appearances.json
    Phase1 途中停止後の再実行で既収集分をスキップして再開できる。
"""

import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

# ========== パス設定 ==========

BASE_DIR      = Path(__file__).resolve().parent.parent
NINJAS_JSON   = BASE_DIR / 'public' / 'data' / 'ninjas.json'
EPISODES_JSON = BASE_DIR / 'public' / 'data' / 'episodes.json'
CACHE_FILE    = BASE_DIR / 'ai_tools' / 'cache_appearances.json'

# ========== ターゲット設定 ==========

# 全アーク共通: wiki表示名 → ninjas.json の name フィールド値
TARGETS_GLOBAL = {
    'ナラク・ニンジャ': 'ナラク・ニンジャ',
    'ナンシー・リン':   'ナンシー・リー',
    'ナンシー・リー':   'ナンシー・リー',   # 旧表記も念のため収集
    'マスラダ・カイ':   'ニンジャスレイヤー',
    'サツバツナイト':   'サツバツナイト',
    'フジキド・ケンジ': 'サツバツナイト',
    'タキ':            'タキ',
    'コトブキ':        'コトブキ',
}

# アーク別に対応先が変わる wiki 表示名（「ニンジャスレイヤー」リンク）
# 第1〜3部・外伝: サツバツナイト（旧ニンジャスレイヤー＝フジキド・ケンジ）
# 第4部: ニンジャスレイヤー（新ニンジャスレイヤー＝マスラダ・カイ）

# 全ターゲットの ninjas.json name 一覧（Phase2 の additions 初期化に使用）
ALL_NINJA_NAMES = set(TARGETS_GLOBAL.values()) | {'ニンジャスレイヤー'}

EPISODE_LIST_PAGES = [
    (
        'https://wikiwiki.jp/njslyr/%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7/%E7%AC%AC1%E9%83%A8',
        '第1部',
    ),
    (
        'https://wikiwiki.jp/njslyr/%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7/%E7%AC%AC2%E9%83%A8',
        '第2部',
    ),
    (
        'https://wikiwiki.jp/njslyr/%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7/%E7%AC%AC3%E9%83%A8',
        '第3部',
    ),
    (
        'https://wikiwiki.jp/njslyr/%E3%82%A8%E3%83%94%E3%82%BD%E3%83%BC%E3%83%89%E4%B8%80%E8%A6%A7/%E7%AC%AC4%E9%83%A8',
        '第4部',
    ),
]

REQUEST_DELAY = 1.5
WIKI_BASE     = 'https://wikiwiki.jp'
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    )
}

# ========== アーク別ターゲットマッチング ==========

def get_ninja_names_for(wiki_text, arc):
    """wiki リンクテキストと arc を受け取り、更新対象 ninjas.json name のリストを返す。"""
    # 全アーク共通マッピング
    if wiki_text in TARGETS_GLOBAL:
        return [TARGETS_GLOBAL[wiki_text]]

    # 「ニンジャスレイヤー」はアークによって対象エントリが変わる
    if wiki_text == 'ニンジャスレイヤー':
        if arc == '第4部':
            return ['ニンジャスレイヤー']
        else:  # 第1〜3部・外伝など
            return ['サツバツナイト']

    return []

def all_wiki_targets():
    """Phase1 で HIT 判定するための wiki テキスト全集合を返す。"""
    return set(TARGETS_GLOBAL.keys()) | {'ニンジャスレイヤー'}

# ========== ヘルパー ==========

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def build_episode_index(episodes):
    idx = {}
    for ep in episodes:
        key = (ep['title'], ep.get('arc', ''))
        idx[key] = ep['id']
    return idx

def fetch_episode_links(list_url, arc):
    resp = requests.get(list_url, headers=HEADERS, timeout=15)
    resp.encoding = 'utf-8'
    soup = BeautifulSoup(resp.text, 'html.parser')
    seen = set()
    links = []
    for a in soup.find_all('a', href=True):
        path = unquote(a['href'])
        if path.startswith('/njslyr/') and path not in seen:
            title_candidate = path[len('/njslyr/'):]
            if title_candidate.startswith('「') and title_candidate.endswith('」'):
                seen.add(path)
                title = title_candidate[1:-1]
                links.append((path, title))
    print(f'  {arc}: {len(links)} エピソード取得')
    return links

def fetch_characters(episode_url):
    time.sleep(REQUEST_DELAY)
    try:
        resp = requests.get(episode_url, headers=HEADERS, timeout=15)
        resp.encoding = 'utf-8'
    except Exception as e:
        print(f'    [WARN] 取得失敗: {episode_url} ({e})')
        return []
    soup = BeautifulSoup(resp.text, 'html.parser')
    chars = []
    for h in soup.find_all(['h2', 'h3']):
        if '登場人物' not in h.get_text():
            continue
        container = h.find_next_sibling('div')
        if container is None:
            continue
        for a in container.find_all('a', href=True):
            name = a.get_text(strip=True)
            if name:
                chars.append(name)
        break
    return chars

def load_cache():
    if os.path.exists(CACHE_FILE):
        return load_json(CACHE_FILE)
    return {}

def save_cache(cache):
    save_json(CACHE_FILE, cache)

# ========== Phase 1: スクレイピング収集 ==========

def phase1(limit=None):
    print('=== Phase 1: エピソード登場人物収集 ===')
    episodes = load_json(EPISODES_JSON)
    ep_idx = build_episode_index(episodes)
    cache = load_cache()
    wiki_targets = all_wiki_targets()

    for list_url, arc in EPISODE_LIST_PAGES:
        print(f'\n--- {arc} ---')
        ep_links = fetch_episode_links(list_url, arc)
        time.sleep(REQUEST_DELAY)

        arc_cache = cache.setdefault(arc, {})
        processed = 0

        for path, title in ep_links:
            if limit and processed >= limit:
                print(f'  --limit {limit} に達したため {arc} を中断')
                break

            if title in arc_cache:
                print(f'  [SKIP cached] {title}')
                continue

            ep_id = ep_idx.get((title, arc)) or ep_idx.get((title, ''))
            if ep_id is None:
                print(f'  [SKIP no-id] "{title}"')
                arc_cache[title] = []
                continue

            ep_url = WIKI_BASE + path
            chars = fetch_characters(ep_url)
            arc_cache[title] = chars
            targets_found = [w for w in wiki_targets if w in chars]
            if targets_found:
                print(f'  [HIT] {title}: {targets_found}')
            else:
                print(f'  [   ] {title}')
            processed += 1
            save_cache(cache)  # エピソードごとに途中保存

        save_cache(cache)  # arc 完了後も保存

    print('\nPhase 1 完了。キャッシュ保存:', CACHE_FILE)

# ========== Phase 2: ninjas.json 更新 ==========

def phase2(dry_run=False):
    print('=== Phase 2: ninjas.json 更新 ===')
    if dry_run:
        print('[DRY-RUN] ninjas.json は変更しません')

    if not os.path.exists(CACHE_FILE):
        print('[ERROR] キャッシュが見つかりません。先に --phase 1 を実行してください。')
        return

    cache = load_cache()
    episodes = load_json(EPISODES_JSON)
    ninjas = load_json(NINJAS_JSON)

    ep_idx = build_episode_index(episodes)
    ninja_idx = {n['name']: n for n in ninjas}

    for ninja_name in ALL_NINJA_NAMES:
        if ninja_name not in ninja_idx:
            print(f'[WARN] "{ninja_name}" が ninjas.json に見つかりません。')

    additions = {name: set() for name in ALL_NINJA_NAMES}

    for arc, arc_cache in cache.items():
        for title, chars in arc_cache.items():
            ep_id = ep_idx.get((title, arc)) or ep_idx.get((title, ''))
            if ep_id is None:
                continue
            for wiki_text in chars:
                for ninja_name in get_ninja_names_for(wiki_text, arc):
                    if ninja_name not in additions:
                        continue
                    existing_ids = {
                        a['id']
                        for a in ninja_idx.get(ninja_name, {}).get('appearances', [])
                    }
                    if ep_id not in existing_ids:
                        additions[ninja_name].add(ep_id)

    print('\n=== 追加集計 ===')
    total = 0
    for ninja_name in sorted(additions):
        ids = additions[ninja_name]
        if ids:
            print(f'  {ninja_name}: {len(ids)} 件追加予定')
            total += len(ids)
    print(f'  合計: {total} 件')

    if dry_run or total == 0:
        return

    for ninja in ninjas:
        ninja_name = ninja['name']
        if ninja_name not in additions or not additions[ninja_name]:
            continue
        existing = ninja.setdefault('appearances', [])
        existing_id_set = {a['id'] for a in existing}
        for ep_id in sorted(additions[ninja_name]):
            if ep_id not in existing_id_set:
                existing.append({'id': ep_id})
        print(f'  [UPDATED] {ninja_name}: appearances {len(existing)} 件')

    save_json(NINJAS_JSON, ninjas)
    print('\nninjas.json を保存しました。')

# ========== Phase 3: appearances ソート ==========

# アーク優先度: 数値が小さいほど前に来る
# 第4部 season有り → (4, season番号, title)
# 第4部 season無し → (9, 0, title) → 最後グループ
# 外伝             → (10, 0, title) → 最後グループ
ARC_PRIORITY = {
    '第1部': 1,
    '第2部': 2,
    '第3部': 3,
    '外伝':  10,
}

def ep_sort_key(ep_info_map, app):
    ep = ep_info_map.get(app.get('id', ''))
    if ep is None:
        return (99, 0, '')
    arc    = ep.get('arc', '')
    season = ep.get('season')
    title  = ep.get('title', '')

    if arc == '第4部':
        if season is not None:
            return (4, int(season), title)
        else:
            return (9, 0, title)

    pri = ARC_PRIORITY.get(arc, 99)
    return (pri, 0, title)

def phase3(dry_run=False):
    print('=== Phase 3: appearances ソート ===')
    if dry_run:
        print('[DRY-RUN] ninjas.json は変更しません')

    episodes = load_json(EPISODES_JSON)
    ninjas   = load_json(NINJAS_JSON)
    ep_info  = {ep['id']: ep for ep in episodes}

    changed = 0
    for ninja in ninjas:
        apps = ninja.get('appearances', [])
        if not apps:
            continue
        sorted_apps = sorted(apps, key=lambda a: ep_sort_key(ep_info, a))
        if sorted_apps != apps:
            ninja['appearances'] = sorted_apps
            changed += 1

    print(f'  {changed} 件のニンジャの appearances をソート済み')

    if not dry_run:
        save_json(NINJAS_JSON, ninjas)
        print('ninjas.json を保存しました。')

# ========== エントリポイント ==========

def main():
    parser = argparse.ArgumentParser(
        description='エピソード登場人物から ninjas.json appearances を更新'
    )
    parser.add_argument(
        '--phase', type=int, choices=[1, 2, 3], default=1,
        help='1: スクレイピング収集, 2: ninjas.json 更新, 3: appearances ソート',
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Phase2/3 で変更を加えず確認のみ',
    )
    parser.add_argument(
        '--limit', type=int, default=None,
        help='Phase1 でテスト用に各部N件に制限',
    )
    args = parser.parse_args()

    if args.phase == 1:
        phase1(limit=args.limit)
    elif args.phase == 2:
        phase2(dry_run=args.dry_run)
    elif args.phase == 3:
        phase3(dry_run=args.dry_run)

if __name__ == '__main__':
    main()
