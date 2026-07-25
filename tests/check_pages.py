#!/usr/bin/env python3
"""ページ動作確認スクリプト - 全ツールをヘッドレスブラウザで開き、JSエラーを検出する。

使い方:
    python3 -m http.server 8093 &          # リポジトリルートで実行
    python3 tests/check_pages.py [port]    # 省略時は 8093

各ページを開いてページエラー・コンソールエラーを収集し、サマリーを表示する。
1件でもエラーがあれば終了コード 1 を返す。
"""
import sys

from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8093"
BASE = f"http://localhost:{PORT}"

PAGES = [
    ("メインページ", "index.html"),
    ("MATPOWER準拠分析スイート", "power_flow_v5.html"),
    ("多手法可視化", "power_flow_visualizer.html"),
    ("計算過程ステップ表示", "power_flow_process_visualizer_v2.html"),
    ("MATPOWER準拠実装", "power_flow_matpower_v2.html"),
    ("収束過程直感的理解 (v6_fixed)", "power_flow_intuitive_v6_fixed.html"),
    ("アルゴリズム比較", "power_flow_compare.html"),
    ("DC潮流精度検証", "dc_accuracy_analysis.html"),
    ("演習問題", "exercises.html"),
    ("はじめに", "getting_started.html"),
    ("講演: Newton-Raphson", "learn_newton.html"),
    ("ラダーL0", "ladder_l0.html"),
    ("ラダーL1", "ladder_l1.html"),
]


def check_page(browser, name, path):
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console.error: {msg.text}")
        if msg.type == "error" and "favicon" not in msg.text
        else None,
    )
    try:
        page.goto(f"{BASE}/{path}", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception as e:  # noqa: BLE001
        errors.append(f"load failed: {e}")
    page.close()
    return errors


def main():
    failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for name, path in PAGES:
            errors = check_page(browser, name, path)
            status = "OK " if not errors else "ERR"
            print(f"{status} {name} ({path})")
            for e in errors:
                print(f"      {e}")
            failed += bool(errors)
        browser.close()

    print(f"\n{len(PAGES) - failed}/{len(PAGES)} pages OK")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
