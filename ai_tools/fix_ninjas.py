#!/usr/bin/env python3
"""
ninjas.json 一括クリーンアップスクリプト
実行: python ai_tools/fix_ninjas.py [--dry-run]

修正内容:
  ① 組織名競合: organizations内の "ソウカイヤ" "ザイバツ" を全エントリから削除
  ② エピソード名エントリを削除
     ・REMOVE_ENTRY_NAMES に列挙された名前の正確一致
     ・名前が「 で始まり 」で終わるエントリ（エピソードタイトル形式）
  ③ ／区切り名前を個別エントリに分割
  ④ 名前付きID（例: ラオモト_カン_2d19cb1f）をハッシュ部分のみに変更
     ※ 数字IDのみの旧形式（177545590 等）は変更しない
"""

import argparse
import json
import re
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
NINJAS_JSON = BASE_DIR / "src" / "data" / "ninjas.json"

# ① 削除対象の組織名（正確一致）
REMOVE_ORG_NAMES = {"ソウカイヤ", "ザイバツ"}

# ② 削除対象のキャラクターエントリ名（正確一致）
# 「〜」パターンに合わない特殊ケースをここに追記する
REMOVE_ENTRY_NAMES = {
    # --- エピソードタイトル（「〜」パターン外） ---
    "「ソウカイ・シンジケート」",
    "「NINJA SLAYER - SAN」",
    "「スレイト・オブ・ニンジャ」登場人物一覧",  # 末尾が「一覧」のためパターン不一致

    # --- ページ名（Wiki のカテゴリ・設定ページ） ---
    "N-FILESに名前のみ登場",
    "各種メディア展開まとめ",
    "地名",
    "武器",
    "ニンジャクラン一覧",
    "ニンジャスレイヤープラス",
    "芸能・アート・文化",
    "マルノウチ抗争",
    "Ask.fm（2）",
    "ジツ",
    "アイサツ・コトワザ・ヤクザスラング・感嘆詞・掛声",
    "コトダマ（あ行～か行）",
    "コトダマ（は行～わ行・英数記号）",
    "ニンジャスレイヤー3部作アーカイブ",
    "Ask.fm（4）",
    "名称不明ニンジャ",
    "生物",
    "翻訳チーム",
    "乗り物",
    "ハシリ・モノ運営関係者",
    "コトダマ空間",
    "ニンジャについて",

    # --- 関連作品名 ---
    "ニンジャスレイヤー フロムアニメイシヨン",
    "ニンジャスレイヤー殺（キルズ）",
    "ニンジャスレイヤー（コミカライズ版）",

    # --- 地名 ---
    "ネオサイタマ",
    "キョート・リパブリック",
    "ネザーオヒガン",

    # --- 組織名 ---
    "ソウカイヤ",
    "過冬",
    "サンズ・オブ・ケオス",
    "ニンジャ修道会",
    "イモータル・ニンジャ・ワークショップ",
    "ネオサイタマ市警",
    "ザイバツ",
    "クラバサ・インコーポレイテッド",
    "ヌーテック社",
    "アルカナム・コンプレックス社",
    "ハンザイ・コンスピラシー",
    "ダークカラテエンパイア",

    # --- 特定個人名なし ---
    "NSTV第三制作部長",
    "傷顔ヤクザ",

    # --- 同一人物（ネヴァーモア） ---
    "オニヤス・カネコ",
}


def fix_orgs(ninjas: list) -> tuple[list, int]:
    """① organizations から REMOVE_ORG_NAMES に含まれる組織を削除"""
    removed = 0
    for n in ninjas:
        orgs = n.get("organizations") or []
        new_orgs = [o for o in orgs if o.get("name") not in REMOVE_ORG_NAMES]
        diff = len(orgs) - len(new_orgs)
        if diff:
            n["organizations"] = new_orgs
            removed += diff
    return ninjas, removed


def _is_episode_entry(n: dict) -> bool:
    """エピソードタイトル形式のエントリかどうかを判定。
    ・REMOVE_ENTRY_NAMES に含まれる名前の正確一致
    ・名前が 「 で始まり 」 で終わる（エピソードタイトル形式）
    """
    name = n.get("name", "")
    if name in REMOVE_ENTRY_NAMES:
        return True
    # 「〜」形式（エピソードタイトル）
    if name.startswith("「") and name.endswith("」"):
        return True
    return False


def remove_episode_entries(ninjas: list) -> tuple[list, int]:
    """② エピソード名エントリを削除"""
    before = len(ninjas)
    ninjas = [n for n in ninjas if not _is_episode_entry(n)]
    return ninjas, before - len(ninjas)


def split_slash_entries(ninjas: list) -> tuple[list, int]:
    """
    ③ ／区切りのエントリを個別エントリに分割。
    元のエントリのorganizations/appearancesを各分割後エントリに継承。
    """
    result = []
    split_count = 0

    # 名前インデックスを構築（分割前の既存エントリを参照するため）
    existing_names = {n["name"] for n in ninjas if "／" not in n.get("name", "")}

    for entry in ninjas:
        name = entry.get("name", "")
        if "／" not in name:
            result.append(entry)
            continue

        # ／で分割
        parts = [p.strip() for p in name.split("／") if p.strip()]
        if len(parts) <= 1:
            result.append(entry)
            continue

        # 各パートを個別エントリとして追加
        for part in parts:
            new_entry = {
                "id":            _new_id(part),
                "name":          part,
                "organizations": list(entry.get("organizations") or []),
                "appearances":   list(entry.get("appearances") or []),
            }
            # その他フィールドも継承（ninjaType, status, wikiUrl 等）
            for field in ("ninjaType", "status", "description", "wikiUrl",
                          "imageUrl", "realName", "aliases", "skills", "ninjaSoul"):
                if entry.get(field) is not None:
                    new_entry[field] = entry[field]
            result.append(new_entry)

        split_count += 1  # 元エントリ1件が分割された

    return result, split_count


def fix_ids(ninjas: list) -> tuple[list, int]:
    """
    ④ 名前付きID（"名前_ハッシュ8桁" 形式）をハッシュ部分のみに変更。
    数字のみのID（旧形式）や既にハッシュのみのIDは変更しない。
    """
    fixed = 0
    seen_ids: set[str] = set()

    for n in ninjas:
        nid = n.get("id", "")
        new_id = _extract_hash_id(nid)
        if new_id != nid:
            # 衝突がある場合は新しいUUIDで上書き
            if new_id in seen_ids:
                new_id = uuid.uuid4().hex[:8]
            n["id"] = new_id
            fixed += 1
        seen_ids.add(n["id"])

    return ninjas, fixed


def _new_id(name: str) -> str:
    """分割後エントリ用の新規ID（ハッシュのみ）"""
    return uuid.uuid4().hex[:8]


def _extract_hash_id(nid: str) -> str:
    """
    "ラオモト_カン_2d19cb1f" → "2d19cb1f"
    "177545590" → "177545590"  （変更なし）
    "2d19cb1f" → "2d19cb1f"   （変更なし）
    """
    # 数字のみ → 変更しない
    if re.fullmatch(r"\d+", nid):
        return nid
    # アンダースコア含む名前付き形式 → 末尾のhex部分を抽出
    m = re.search(r"_([a-f0-9]{6,8})$", nid)
    if m:
        return m.group(1)
    # それ以外（既にハッシュのみ等）→ 変更しない
    return nid


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="変更をプレビューのみ（保存しない）")
    args = parser.parse_args()

    print("=" * 60)
    print("ninjas.json クリーンアップ")
    print("=" * 60)

    with open(NINJAS_JSON, encoding="utf-8") as f:
        ninjas = json.load(f)
    print(f"\n読み込み: {len(ninjas)}件\n")

    # ① 組織名クリーンアップ
    ninjas, org_removed = fix_orgs(ninjas)
    print(f"① 組織名削除 ({', '.join(REMOVE_ORG_NAMES)}): {org_removed}件のorg参照を削除")

    # ② エピソード名エントリ削除
    ninjas, ep_removed = remove_episode_entries(ninjas)
    print(f"② エピソード名エントリ削除: {ep_removed}件")

    # ③ ／区切り分割
    slash_before = sum(1 for n in ninjas if "／" in n.get("name", ""))
    ninjas, split_count = split_slash_entries(ninjas)
    slash_after = sum(1 for n in ninjas if "／" in n.get("name", ""))
    print(f"③ ／区切り分割: {split_count}件のエントリを個別化（残存スラッシュ: {slash_after}件）")

    # ④ ID修正
    ninjas, id_fixed = fix_ids(ninjas)
    print(f"④ ID修正 (名前付き→ハッシュのみ): {id_fixed}件")

    print(f"\n処理後: {len(ninjas)}件")

    if args.dry_run:
        print("\n--dry-run のため保存しません")

        # プレビュー: ③の分割結果を表示
        print("\n[③ 分割プレビュー（最初の10件）]")
        shown = 0
        for n in ninjas:
            if "／" not in n.get("name", "") and len(n.get("id", "")) <= 10 and shown < 10:
                # 分割後エントリを特定するのが難しいのでランダムIDのものを表示
                pass
        # 代わりに元の slash_entries の処理結果を再表示
        with open(NINJAS_JSON, encoding="utf-8") as f:
            orig = json.load(f)
        for entry in orig[:300]:
            if "／" in entry.get("name", "") and shown < 10:
                parts = [p.strip() for p in entry["name"].split("／") if p.strip()]
                print(f"  [{entry['name']}] → {parts}")
                shown += 1

        return

    # 保存
    with open(NINJAS_JSON, "w", encoding="utf-8") as f:
        json.dump(ninjas, f, ensure_ascii=False, indent=2)

    print(f"\n保存完了: {NINJAS_JSON}")


if __name__ == "__main__":
    main()
