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

対象キャラクターの拡張:
    TARGETS 辞書に追記する。
    キー: エピソードページ上の表示名（wikiリンクテキスト）
    値 : ninjas.json の name フィールド値

対象エピソード一覧ページの拡張:
    EPISODE_LIST_PAGES に (URL, arc名) を追加する。
    arc名は episodes.json の "arc" フィールドと一致させること。

キャッシュファイル:
    ai_tools/cache_appearances.json
    Phase1 途中停止後の再実行で既収集分をスキップして再開できる。
"""

import argparse
import json
import os
import time
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

# ========== 設定 ==========

TARGETS = {
    'ニンジャスレイヤー': 'サツバツナイト',
    'ナラク・ニンジャ':   'ナラク・ニンジャ',
    'ナンシー・リー':     'ナンシー・リー',
}

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
]

REQUEST_DELAY = 1.5
NINJAS_JSON   = 'src/data/ninjas.json'
EPISODES_JSON = 'src/data/episodes.json'
CACHE_FILE    = 'ai_tools/cache_appearances.json'
WIKI_BASE     = 'https://wikiwiki.jp'
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    )
}

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
            if title_candidate.startswith('') and '「' in title_candidate:
                # 「タイトル」形式のみ
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

# ========== Phase 1 ==========

def phase1(limit=None):
    print('=== Phase 1: エピソード登場人物収集 ===')
    episodes = load_json(EPISODES_JSON)
    ep_idx = build_episode_index(episodes)
    cache = load_cache()

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
            targets_found = [w for w in TARGETS if w in chars]
            if targets_found:
                print(f'  [HIT] {title}: {targets_found}')
            else:
                print(f'  [   ] {title}')
            processed += 1
            save_cache(cache)  # エピソードごとに途中保存

        save_cache(cache)  # arc 完了後も保存

    print('\nPhase 1 完了。キャッシュ保存:', CACHE_FILE)

# ========== Phase 2 ==========

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

    for wiki_name, ninja_name in TARGETS.items():
        if ninja_name not in ninja_idx:
            print(f'[ERROR] "{ninja_name}" が ninjas.json に見つかりません。')
            return

    additions = {ninja_name: set() for ninja_name in TARGETS.values()}

    for arc, arc_cache in cache.items():
        for title, chars in arc_cache.items():
            ep_id = ep_idx.get((title, arc)) or ep_idx.get((title, ''))
            if ep_id is None:
                continue
            for wiki_name, ninja_name in TARGETS.items():
                if wiki_name in chars:
                    existing_ids = {a['id'] for a in ninja_idx[ninja_name].get('appearances', [])}
                    if ep_id not in existing_ids:
                        additions[ninja_name].add(ep_id)

    print('\n=== 追加集計 ===')
    total = 0
    for ninja_name, ids in additions.items():
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

# ========== エントリポイント ==========

def main():
    parser = argparse.ArgumentParser(
        description='エピソード登場人物から ninjas.json appearances を更新'
    )
    parser.add_argument('--phase', type=int, choices=[1, 2], default=1,
                        help='1: スクレイピング収集, 2: ninjas.json 更新')
    parser.add_argument('--dry-run', action='store_true',
                        help='Phase2 で変更を加えず確認のみ')
    parser.add_argument('--limit', type=int, default=None,
                        help='Phase1 でテスト用に各部N件に制限')
    args = parser.parse_args()

    if args.phase == 1:
        phase1(limit=args.limit)
    elif args.phase == 2:
        phase2(dry_run=args.dry_run)

if __name__ == '__main__':
    main()
