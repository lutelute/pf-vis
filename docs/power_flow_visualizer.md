# power_flow_visualizer.html — 多手法可視化

## 概要

潮流計算アルゴリズムをカード形式で一覧し、実装済み手法を実際に実行して
収束曲線・反復回数・実行時間を観察できる可視化ツールです。
ランダム生成した系統（ノード数・ブランチ数を指定）に対して計算します。

## 実行される計算と「解説のみ」の区別

このページのカードには20種の手法が並びますが、**実際に数値計算を行うのは
共有エンジン（`scripts/power_flow_engine.js`）に実装された4手法のみ**です:

| 手法 | エンジンコード |
|---|---|
| Newton-Raphson法（極座標） | `nr` |
| Gauss-Seidel法 | `gs` |
| Fast Decoupled法（XB） | `fdxb` |
| DC潮流計算 | `dc` |

その他の手法（Iwamoto法、連続潮流、HELM、Backward-Forward Sweep等）は
**数式・特徴の解説カタログ**であり、実行結果は表示されません（「解説のみ」と表示）。

> 旧バージョンではこれらの手法に対して特性パラメータによる疑似収束曲線を
> 表示していましたが、実測と誤解されるため廃止しました。

## 学習目標

- 多様な潮流計算手法の分類（Newton系 / 不動点反復系 / 線形近似）を俯瞰する
- 実装済み4手法の収束特性の違いを実データで比較する
- 数式タブで各手法の更新式を確認する

## 使い方

1. ノード数・ブランチ数・許容誤差・最大反復回数を設定
2. 「系統生成」でランダム系統を生成（MATPOWER形式に内部変換される）
3. 「全アルゴリズム実行」で実装済み手法を一括実行
4. カードの収束曲線・下部の比較チャート・結果表で確認

## アーキテクチャ

- 共有モジュール `scripts/ieee_cases.js` / `scripts/power_flow_engine.js` を読み込み
- ランダム系統は内部で MATPOWER 形式（bus/gen/branch）に変換して `PowerFlowEngine` に渡す
- 可視化は Canvas API による独自描画

## 関連文書

- 理論の詳細: [power_flow_methods.md](./power_flow_methods.md)
- IEEE標準系統での手法比較: [power_flow_compare.md](./power_flow_compare.md)
