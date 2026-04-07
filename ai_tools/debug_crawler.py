#!/usr/bin/env python3
"""
wiki_crawler.py のデバッグスクリプト
PythonのBeautifulSoupが実際に何を受信しているか確認する。
"""
import time
from pathlib import Path
from urllib.parse import unquote

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.run(["pip", "install", "requests", "beautifulsoup4", "--break-system-packages", "-q"])
    import requests
    from bs4 import BeautifulSoup

URL = "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7"
# URL = "https://wikiwiki.jp/njslyr/%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7%EF%BC%88%E7%AC%AC4%E9%83%A8%E4%BB%A5%E9%99%8D%EF%BC%89"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ja,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

print(f"取得中: {URL}")
resp = requests.get(URL, headers=HEADERS, timeout=25)
resp.encoding = "utf-8"
print(f"ステータス: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('Content-Type')}")
print(f"HTML長: {len(resp.text)} 文字")

# 受信HTMLの最初の2000文字を確認
print("\n--- HTML先頭2000文字 ---")
print(resp.text[:2000])

soup = BeautifulSoup(resp.text, "html.parser")
content = soup.find(id="content")
print(f"\n--- id='content' 要素: {'あり' if content else 'なし'} ---")

if content:
    print(f"content のタグ: {content.name}")

    # 直接の子要素を一覧表示
    print("\n--- content の直接子要素（最初の10件）---")
    count = 0
    for el in content.children:
        tag = getattr(el, "name", None)
        if tag is None:
            continue
        text = el.get_text(strip=True)[:80]
        print(f"  {count:3d}: <{tag}> class={el.get('class','')} | '{text}'")
        count += 1
        if count >= 10:
            print("  ... (10件で打ち切り)")
            break

    # H2/H3要素（find_all で全子孫から検索）
    headings = content.find_all(["h2", "h3", "h4"])
    print(f"\n--- H2/H3/H4 見出し一覧（全子孫検索）: {len(headings)}件 ---")
    for h in headings[:15]:
        print(f"  <{h.name}> '{h.get_text(strip=True)[:50]}'")

    # ---- 修正後パーサーのテスト ----
    import sys; sys.path.insert(0, str(Path(__file__).parent))
    from urllib.parse import unquote as _unquote

    NON_ORG_TITLES = {"地名", "ニンジャクラン一覧", "翻訳チーム", ""}
    SKIP_ORG_NAMES = {"目次", "Contents", "編集", "翻訳チームによるニンジャ名鑑", ""}
    ORG_KW = ["登場人物一覧", "クラン一覧", "リアルニンジャ一覧", "::cmd"]
    BASE = "https://wikiwiki.jp"

    def _org_name(el):
        for a in el.find_all("a", href=True):
            href = a.get("href", "")
            if not href.startswith("/njslyr/"): continue
            if "登場人物一覧" in _unquote(href): continue
            t = a.get("title","").strip()
            if t and t not in NON_ORG_TITLES: return t
        raw = el.get_text(strip=True)
        import re as _re
        return _re.sub(r"[◆†¶\s]+", " ", raw).strip()

    def _is_char(href):
        return href.startswith("/njslyr/") and not any(kw in href for kw in ORG_KW)

    sections = []
    for heading in headings:
        org = _org_name(heading)
        if org in SKIP_ORG_NAMES or len(org) < 2: continue
        sec = {"org": org, "ref": None, "chars": 0}
        sections.append(sec)
        for sib in heading.find_next_siblings():
            if sib.name in ("h2","h3","h4"): break
            if sib.name == "p":
                for a in sib.find_all("a", href=True):
                    href = a.get("href","")
                    if href.startswith("/njslyr/") and "登場人物一覧" not in _unquote(href) and "::cmd" not in href:
                        sec["ref"] = BASE + href.split("#")[0]; break
            elif sib.name == "ul":
                for ul2 in sib.find_all("ul", class_="list2"):
                    for a in ul2.find_all("a", href=True):
                        if _is_char(a.get("href","")): sec["chars"] += 1

    print(f"\n--- 修正後パーサー結果: {len(sections)}セクション ---")
    for s in sections[:20]:
        kind = f"→組織ページ" if s["ref"] else f"直接{s['chars']}件"
        print(f"  [{kind:10s}] {s['org'][:35]}")
    if len(sections) > 20:
        print(f"  ... 計{len(sections)}セクション")

else:
    # content が見つからない場合、利用可能なIDを確認
    all_ids = [el.get("id") for el in soup.find_all(id=True)][:20]
    print(f"利用可能なid属性: {all_ids}")

    # ボディ直下の要素を確認
    print("\n--- body 直下の要素 ---")
    body = soup.find("body")
    if body:
        for i, el in enumerate(body.children):
            tag = getattr(el, "name", None)
            if tag:
                print(f"  {i}: <{tag}> class={el.get('class','')} id={el.get('id','')}")
            if i > 20:
                break

# レスポンスにJavaScriptが必要なサインがないか確認
if "javascript" in resp.text.lower() and len(resp.text) < 5000:
    print("\n⚠ JavaScriptリダイレクト/チャレンジページの可能性があります")
if "cloudflare" in resp.text.lower():
    print("\n⚠ Cloudflare チャレンジの可能性があります")
if "captcha" in resp.text.lower():
    print("\n⚠ CAPTCHA ページの可能性があります")
