# power_flow_matpower_v2.html — MATPOWER準拠実装

## 概要

電力系統解析の標準ソフトウェア **MATPOWER** のデータ形式（mpc.bus / mpc.gen /
mpc.branch）に準拠した潮流計算ツールです。共有計算エンジン
（`scripts/power_flow_engine.js`）を使用し、その結果は MATPOWER の公式解と
照合検証されています（`tests/verify_algorithms.mjs`）。
学習パスの「実践」段階に位置づけられます。

## 学習目標

- MATPOWER形式（bus/gen/branchの列定義、p.u.系）でのデータの読み方を身につける
- 実務レベルの系統（IEEE 9/14/30母線）で潮流計算を実行し、結果表を解釈する
- 母線タイプ（Slack/PV/PQ）が計算上どう扱われるかを理解する

## 実装アルゴリズム

共有エンジンの3手法＋DC:

| 手法 | 特徴 |
|---|---|
| Newton-Raphson（極座標） | 標準手法。IEEE 14で4反復収束 |
| Fast Decoupled XB | B′/B″固定の高速法 |
| Gauss-Seidel | 教育用（線形収束の遅さを体感できる） |

## 収録系統

`scripts/ieee_cases.js` の5系統（2 / 5 / 9(WSCC) / 14 / 30 母線）。
9/14/30母線は MATPOWER の case9 / case14 / case_ieee30 と同一データです。

## 検証状態

- IEEE 14母線: 全母線電圧が MATPOWER `runpf(case14)` と一致（最大差 8×10⁻⁵ p.u.）、
  総損失 13.393 MW 一致
- WSCC 9母線: 全母線電圧一致、総損失 4.641 MW 一致

## 使い方

1. 系統・アルゴリズム・収束判定値を選択
2. 「▶ 実行」で連続実行、「⏭ ステップ」で1反復ずつ
3. 母線結果表（|V|, δ, P, Q, ミスマッチ）と収束曲線を確認

## 関連文書

- 理論の詳細: [power_flow_methods.md](./power_flow_methods.md)
- MATPOWER: https://matpower.org
