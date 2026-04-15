#!/usr/bin/env python3
"""
ソウカイヤ組織ページからスクレイピングしたデータをninjas.jsonに反映するスクリプト。
- 既存キャラクターに組織（ソウカイヤ第1部 / 第4部）を設定
- 未収録キャラクターを新規追加
"""

import json
import re
import uuid
from pathlib import Path

# ============================================================
# パス設定
# ============================================================
BASE_DIR = Path(__file__).parent.parent
NINJAS_JSON = BASE_DIR / "src" / "data" / "ninjas.json"

# ============================================================
# ソウカイヤ構成員定義（Wikiページから手動抽出）
# ============================================================

ORG_P1 = {"id": "soukaiya-p1", "name": "ソウカイヤ（第1部）"}
ORG_P4 = {"id": "soukaiya-p4", "name": "ソウカイヤ（第4部）"}

# ----- 第1部 -----
# 各エントリは (表示名, 別名またはNone, ninjaType, wikiUrl or None)
# ninjaType: None = 不明のまま保持

SOUKAIYA_P1 = [
    # 首脳部
    ("ラオモト・カン",         None,               "リアルニンジャ",          None),
    ("ゲイトキーパー",         None,               "ニンジャソウル憑依者",     None),
    ("ダークニンジャ",         None,               "ニンジャソウル憑依者",     None),
    # シックスゲイツ
    ("アースクエイク",         None,               "ニンジャソウル憑依者",     "https://wikiwiki.jp/njslyr/%E3%82%A2%E3%83%BC%E3%82%B9%E3%82%AF%E3%82%A8%E3%82%A4%E3%82%AF"),
    ("インターラプター",       None,               "ニンジャソウル憑依者",     None),
    ("コッカトリス",           None,               "ニンジャソウル憑依者",     None),
    ("バンディット",           None,               "ニンジャソウル憑依者",     None),
    ("ビホルダー",             None,               "ニンジャソウル憑依者",     None),
    ("ヒュージシュリケン",     None,               "ニンジャソウル憑依者",     None),
    ("ダイダロス",             None,               "ニンジャソウル憑依者",     None),
    ("ヘルカイト",             None,               "ニンジャソウル憑依者",     None),
    ("アルマジロ",             None,               "ニンジャソウル憑依者",     None),
    ("ウォーターボード",       None,               "ニンジャソウル憑依者",     None),
    ("デビルフィッシュ",       None,               "ニンジャソウル憑依者",     None),
    ("モービッド",             None,               "ニンジャソウル憑依者",     None),
    ("レイザーエッジ",         None,               "ニンジャソウル憑依者",     None),
    ("ウォーロック",           None,               "ニンジャソウル憑依者",     None),
    ("ガーゴイル",             None,               "ニンジャソウル憑依者",     None),
    ("クイックシルヴァー",     None,               "ニンジャソウル憑依者",     None),
    ("ソニックブーム",         None,               "ニンジャソウル憑依者",     None),
    ("ナイトシェイド",         None,               "ニンジャソウル憑依者",     None),
    ("フロストバイト",         None,               "ニンジャソウル憑依者",     None),
    # その他所属ニンジャ
    ("アーソン",               None,               "ニンジャソウル憑依者",     None),
    ("アイアンヴァイス",       None,               "ニンジャソウル憑依者",     None),
    ("アイアンフィスト",       None,               "ニンジャソウル憑依者",     None),
    ("アイスシールド",         None,               "ニンジャソウル憑依者",     None),
    ("アゴニィ",               None,               "ニンジャソウル憑依者",     None),
    ("アルバトロス",           None,               "ニンジャソウル憑依者",     None),
    ("イクエイション",         None,               "ニンジャソウル憑依者",     None),
    ("インパルス",             None,               "ニンジャソウル憑依者",     None),
    ("インフェクション",       None,               "ニンジャソウル憑依者",     None),
    ("ウィールダー",           None,               "ニンジャソウル憑依者",     None),
    ("ヴィトリオール",         None,               "ニンジャソウル憑依者",     None),
    ("オニヤス・カネコ",       None,               None,                        None),
    ("オフェンダー",           None,               "ニンジャソウル憑依者",     None),
    ("オブリヴィオン",         None,               "ニンジャソウル憑依者",     None),
    ("ガントレット",           None,               "ニンジャソウル憑依者",     None),
    ("クイックサンド",         None,               "ニンジャソウル憑依者",     None),
    ("クエスチョナー",         None,               "ニンジャソウル憑依者",     None),
    ("クレアボヤンス",         None,               "ニンジャソウル憑依者",     None),
    ("グレイハウンド",         None,               "ニンジャソウル憑依者",     None),
    ("グレネディア",           None,               "ニンジャソウル憑依者",     None),
    ("コーシャス",             None,               "ニンジャソウル憑依者",     None),
    ("コラプション",           None,               "ニンジャソウル憑依者",     None),
    ("コンストリクター",       None,               "ニンジャソウル憑依者",     None),
    ("サードアイ",             None,               "ニンジャソウル憑依者",     None),
    ("サイプレス",             None,               "ニンジャソウル憑依者",     None),
    ("サブシスタンス",         None,               "ニンジャソウル憑依者",     None),
    ("サボター",               None,               "ニンジャソウル憑依者",     None),
    ("サンセット",             None,               "ニンジャソウル憑依者",     None),
    ("シャープトゥース",       None,               "ニンジャソウル憑依者",     None),
    ("スーサイド",             ["ショーゴー・マグチ"], "ニンジャソウル憑依者", None),
    ("スキールニル",           None,               "ニンジャソウル憑依者",     None),
    ("スキャッター",           None,               "ニンジャソウル憑依者",     None),
    ("スクワッシャー",         None,               "ニンジャソウル憑依者",     None),
    ("スコルピオン",           None,               "ニンジャソウル憑依者",     None),
    ("ストーンゴーレム",       None,               "ニンジャソウル憑依者",     None),
    ("スパイダー",             None,               "ニンジャソウル憑依者",     None),
    ("スマッグラー",           None,               "ニンジャソウル憑依者",     None),
    ("ゼブラ",                 None,               "ニンジャソウル憑依者",     None),
    ("センチピード",           None,               "ニンジャソウル憑依者",     None),
    ("セントリー",             None,               "ニンジャソウル憑依者",     None),
    ("ソーンヴァイン",         None,               "ニンジャソウル憑依者",     None),
    ("ダブルソード",           None,               "ニンジャソウル憑依者",     None),
    ("タルピダイ",             None,               "ニンジャソウル憑依者",     None),
    ("チューブラー",           None,               "ニンジャソウル憑依者",     None),
    ("ディサイプル",           None,               "ニンジャソウル憑依者",     None),
    ("デスソーサー",           None,               "ニンジャソウル憑依者",     None),
    ("デッドライン",           None,               "ニンジャソウル憑依者",     None),
    ("デッドリーフ",           None,               "ニンジャソウル憑依者",     None),
    ("テンカウント",           None,               "ニンジャソウル憑依者",     None),
    ("ドミナント",             None,               "ニンジャソウル憑依者",     None),
    ("トラッフルホッグ",       None,               "ニンジャソウル憑依者",     None),
    ("ナイトクーガー",         None,               "ニンジャソウル憑依者",     None),
    ("ナインフィンガー",       None,               "ニンジャソウル憑依者",     None),
    ("ナッツクラッカー",       None,               "ニンジャソウル憑依者",     None),
    ("バーグラー",             None,               "ニンジャソウル憑依者",     None),
    ("バイコーン",             None,               "ニンジャソウル憑依者",     None),
    ("バタフライ",             None,               "ニンジャソウル憑依者",     None),
    ("パラポネラ",             None,               "ニンジャソウル憑依者",     None),
    ("ビーハイヴ",             None,               "ニンジャソウル憑依者",     None),
    ("ファイアイーター",       None,               "ニンジャソウル憑依者",     None),
    ("フェルピット",           None,               "ニンジャソウル憑依者",     None),
    ("ブラックストライプス",   None,               "ニンジャソウル憑依者",     None),
    ("ブルースクイッド",       None,               "ニンジャソウル憑依者",     None),
    ("プロミネンス",           None,               "ニンジャソウル憑依者",     None),
    ("ペイヴメント",           None,               "ニンジャソウル憑依者",     None),
    ("ベイルファイア",         None,               "ニンジャソウル憑依者",     None),
    ("ヘルディーラー",         None,               "ニンジャソウル憑依者",     None),
    ("ホーネット",             None,               "ニンジャソウル憑依者",     None),
    ("ホロスコープ",           None,               "ニンジャソウル憑依者",     None),
    ("マタドール",             None,               "ニンジャソウル憑依者",     None),
    ("ミニットマン",           None,               "ニンジャソウル憑依者",     None),
    ("ミュルミドン",           None,               "ニンジャソウル憑依者",     None),
    ("ユコバック",             None,               "ニンジャソウル憑依者",     None),
    ("ラウンダーズ",           None,               "ニンジャソウル憑依者",     None),
    ("ラバーダック",           None,               "ニンジャソウル憑依者",     None),
    ("レオパルド",             None,               "ニンジャソウル憑依者",     None),
    ("ロングドゥア",           None,               "ニンジャソウル憑依者",     None),
    ("ワイアード",             None,               "ニンジャソウル憑依者",     None),
    # ガイオン潜伏部隊
    ("ダストスパイダー",       None,               "ニンジャソウル憑依者",     None),
    ("ヴァンガード",           None,               "ニンジャソウル憑依者",     None),
    ("テラーマシーン",         None,               "ニンジャソウル憑依者",     None),
    ("ブリガンド",             None,               "ニンジャソウル憑依者",     None),
]

# ----- 第4部 -----
SOUKAIYA_P4 = [
    # 首脳部
    ("ラオモト・チバ",         None,               "非ニンジャ",               None),
    ("テンプテイション",       None,               "ニンジャソウル憑依者",     None),
    ("ネヴァーモア",           None,               "ニンジャソウル憑依者",     None),
    # シックスゲイツ（第4部）
    ("ヴァニティ",             None,               "ニンジャソウル憑依者",     None),
    ("ガーランド",             None,               "ニンジャソウル憑依者",     None),
    ("カバレット",             None,               "ニンジャソウル憑依者",     None),
    ("シガーカッター",         None,               "ニンジャソウル憑依者",     None),
    ("デッドフレア",           None,               "ニンジャソウル憑依者",     None),
    ("ホローポイント",         None,               "ニンジャソウル憑依者",     None),
    ("インシネレイト",         None,               "ニンジャソウル憑依者",     None),
    # その他所属ニンジャ（第4部）
    ("アイアンゲート",         None,               "ニンジャソウル憑依者",     None),
    ("アウクシリア",           None,               "ニンジャソウル憑依者",     None),
    ("アラマンダ",             None,               "ニンジャソウル憑依者",     None),
    ("アロガント",             None,               "ニンジャソウル憑依者",     None),
    ("イルストーン",           None,               "ニンジャソウル憑依者",     None),
    ("クレイマン",             None,               "ニンジャソウル憑依者",     None),
    ("サイレントブロー",       None,               "ニンジャソウル憑依者",     None),
    ("シュピーゲル",           None,               "ニンジャソウル憑依者",     None),
    ("デスペレイト",           None,               "ニンジャソウル憑依者",     None),
    ("プリーストパンチャー",   None,               "ニンジャソウル憑依者",     None),
    ("ブルハウンド",           None,               "ニンジャソウル憑依者",     None),
    ("メイレイン",             None,               "ニンジャソウル憑依者",     None),
    ("ラスティクル",           None,               "ニンジャソウル憑依者",     None),
    ("リザードベノム",         None,               "ニンジャソウル憑依者",     None),
    ("ロミオ",                 None,               "ニンジャソウル憑依者",     None),
    # 非ニンジャ
    ("クスバ",                 None,               "非ニンジャ",               None),
]

# ============================================================
# ユーティリティ
# ============================================================

def make_id(name: str) -> str:
    """キャラクター名からIDを生成する（新規追加用）"""
    # 短いハッシュ代わりにuuid4の先頭8文字 + サニタイズ名
    safe = re.sub(r'[^\w]', '_', name)[:20]
    uid = str(uuid.uuid4()).split('-')[0]
    return f"{safe}_{uid}"


def has_org(ninja: dict, org_id: str) -> bool:
    return any(o.get("id") == org_id for o in (ninja.get("organizations") or []))


def add_org(ninja: dict, org: dict):
    if ninja.get("organizations") is None:
        ninja["organizations"] = []
    if not has_org(ninja, org["id"]):
        ninja["organizations"].append({"id": org["id"]})


def build_name_index(ninjas: list[dict]) -> dict[str, dict]:
    """名前とエイリアスで引けるインデックスを作る"""
    idx: dict[str, dict] = {}
    for n in ninjas:
        idx[n["name"]] = n
        for alias in (n.get("aliases") or []):
            idx[alias] = n
    return idx


def process(members: list, org: dict, ninjas: list, index: dict) -> tuple[int, int]:
    updated = 0
    added = 0
    for (name, aliases, ninja_type, wiki_url) in members:
        if name in index:
            ninja = index[name]
            add_org(ninja, org)
            # 未設定のフィールドだけ補完
            if ninja_type and not ninja.get("ninjaType"):
                ninja["ninjaType"] = ninja_type
            if wiki_url and not ninja.get("wikiUrl"):
                ninja["wikiUrl"] = wiki_url
            if aliases:
                existing_aliases = set(ninja.get("aliases") or [])
                for a in aliases:
                    if a not in existing_aliases:
                        ninja.setdefault("aliases", []).append(a)
                        index[a] = ninja  # インデックスも更新
            updated += 1
        else:
            # 新規追加
            new_ninja: dict = {
                "id": make_id(name),
                "name": name,
                "organizations": [{"id": org["id"]}],
                "appearances": [],
            }
            if aliases:
                new_ninja["aliases"] = aliases
            if ninja_type:
                new_ninja["ninjaType"] = ninja_type
            if wiki_url:
                new_ninja["wikiUrl"] = wiki_url
            ninjas.append(new_ninja)
            index[name] = new_ninja
            if aliases:
                for a in aliases:
                    index[a] = new_ninja
            added += 1
    return updated, added


# ============================================================
# メイン
# ============================================================

def main():
    print("=" * 60)
    print("ソウカイヤ組織データ反映スクリプト")
    print("=" * 60)

    with open(NINJAS_JSON, encoding="utf-8") as f:
        ninjas: list[dict] = json.load(f)
    print(f"\n読み込み: {len(ninjas)}件")

    index = build_name_index(ninjas)

    print("\n[第1部] 構成員を処理中...")
    u1, a1 = process(SOUKAIYA_P1, ORG_P1, ninjas, index)
    print(f"  更新: {u1}件  新規追加: {a1}件")

    print("[第4部] 構成員を処理中...")
    u4, a4 = process(SOUKAIYA_P4, ORG_P4, ninjas, index)
    print(f"  更新: {u4}件  新規追加: {a4}件")

    # 保存
    with open(NINJAS_JSON, "w", encoding="utf-8") as f:
        json.dump(ninjas, f, ensure_ascii=False, indent=2)

    total = len(ninjas)
    print(f"\n保存完了: {NINJAS_JSON}")
    print(f"総キャラクター数: {total}件（+{a1+a4}件追加）")

    # 確認
    org_p1_count = sum(1 for n in ninjas if has_org(n, ORG_P1["id"]))
    org_p4_count = sum(1 for n in ninjas if has_org(n, ORG_P4["id"]))
    print(f"\nソウカイヤ（第1部）: {org_p1_count}件")
    print(f"ソウカイヤ（第4部）: {org_p4_count}件")


if __name__ == "__main__":
    main()
