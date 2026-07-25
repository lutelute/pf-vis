# Power Flow Visualization — 潮流計算 可視化教材

電力系統の潮流計算（Power Flow）アルゴリズムを、ブラウザ上で対話的に学べる教育プラットフォームです。
Newton-Raphson法・Gauss-Seidel法・高速分離法（Fast Decoupled）・DC潮流計算の動作過程・収束特性・精度特性を、実際に動かしながら理解できます。

## 🌐 オンライン版

**GitHub Pages**: https://lutelute.github.io/pf-vis/

すべてのツールがブラウザだけで動作します（インストール不要・外部ライブラリ非依存）。

## 🎓 推奨学習パス

| 順序 | レベル | ツール | 学べること |
|---|---|---|---|
| 0 | 準備 | [はじめに](https://lutelute.github.io/pf-vis/getting_started.html) | 前提知識・用語早見表・最初の5分クイックスタート |
| 1 | 入門 | [収束過程直感的理解](https://lutelute.github.io/pf-vis/power_flow_intuitive_v6_fixed.html) | 潮流計算＝非線形方程式の反復解法であること。解に収束していく様子を複素電圧平面で体感 |
| 2 | 基礎 | [計算過程ステップ表示](https://lutelute.github.io/pf-vis/power_flow_process_visualizer_v2.html) | Newton-Raphson法の1反復の中身（ミスマッチ計算→ヤコビアン→修正量）を式と数値で追う |
| 3 | 比較 | [アルゴリズム同時比較](https://lutelute.github.io/pf-vis/power_flow_compare.html) | 4手法を同一系統で同時実行し、収束次数（2次収束 vs 線形収束）の違いを見る |
| 4 | 実践 | [MATPOWER準拠実装](https://lutelute.github.io/pf-vis/power_flow_matpower_v2.html) | 実務標準のMATPOWERデータ形式（bus/gen/branch）でIEEE標準系統を解く |
| 5 | 発展 | [統合分析スイート](https://lutelute.github.io/pf-vis/power_flow_v5.html) | 発展的手法（Levenberg-Marquardt・連続潮流・HELM等）を含む8手法の横断分析 |
| 6 | 応用 | [DC潮流精度検証](https://lutelute.github.io/pf-vis/dc_accuracy_analysis.html) | 線形近似（DC潮流）の精度と適用限界をAC解との比較で定量化 |

補助ツール: [多手法可視化](https://lutelute.github.io/pf-vis/power_flow_visualizer.html) — 各手法を個別にじっくり実行・観察

**✏️ [演習問題](https://lutelute.github.io/pf-vis/exercises.html)** — 各段階に対応した全18問（手計算チャレンジ・ツール操作・考察、難易度表示つき）。
数値入力の自動判定（22入力欄・達成状況はブラウザに保存）と考察問題の自己評価チェックリスト付き。

### 教材としての仕掛け

- **学習ガイドバー**: 各ツールページ先頭に学習目標・前後の導線・演習/用語集リンクを常設
- **実数値の見える化**: ヤコビアン・B行列を実数値で表示し、クリック/ホバーで計算式と物理的意味を接続
- **解の妥当性の常時提示**: 電力収支（総発電=総負荷+総損失）の検算を各解析ページで自動表示
- **収束の質の実測**: 収束曲線に加え「真の解への距離」と実測収束次数 p（NR≈2, GS≈1）を表示

## 📐 数学的基礎

潮流計算は、各母線の電力収支を表す非線形代数方程式系の求解です:

```
P_i = Σ_j |V_i||V_j| [G_ij cos(θ_i−θ_j) + B_ij sin(θ_i−θ_j)]
Q_i = Σ_j |V_i||V_j| [G_ij sin(θ_i−θ_j) − B_ij cos(θ_i−θ_j)]
```

ここで V_i = |V_i|e^{jθ_i} は母線 i の複素電圧、G_ij + jB_ij はアドミタンス行列 Y の要素です。
指定値との差（ミスマッチ）ΔP = P_spec − P_calc, ΔQ = Q_spec − Q_calc をゼロに追い込みます。

### 実装アルゴリズムと特性

| 手法 | 反復式 | 収束 | 計算量/反復 | 主な用途 |
|---|---|---|---|---|
| **Newton-Raphson (NR)** | J·[Δθ; Δ\|V\|] = [ΔP; ΔQ] | 2次 | O(n³) | 汎用（事実上の標準） |
| **高速分離法 (FDXB)** | B′Δθ = ΔP/\|V\|,  B″Δ\|V\| = ΔQ/\|V\| | 線形(高速) | O(n²)※ | 大規模送電系統 |
| **Gauss-Seidel (GS)** | V_i ← (1/Y_ii)[S_i*/V_i* − Σ_{j≠i} Y_ij V_j] | 線形 | O(n²) | 教育・小規模系統 |
| **DC潮流** | P = Bθ（直接解法・反復なし） | — | O(n³) 1回 | 経済負荷配分・概算 |

※ B′, B″ は定数行列のため、LU分解を初回のみ行えば以降は前進後退代入のみ。

収束速度の違いは実際に動かすとよく分かります。IEEE 14母線系統・許容誤差 1e-6 の場合:
**NR: 4〜5回 / FDXB: 22回 / GS: 179回**（GSの線形収束の遅さが体感できます）。

## ✅ 正確性の検証

共有計算エンジン（`scripts/power_flow_engine.js`）と系統データ（`scripts/ieee_cases.js`）は、
MATPOWER の公式解と照合して検証しています:

- **IEEE 14母線**: 全母線電圧が MATPOWER `runpf(case14)` と一致（最大差 8×10⁻⁵ p.u.）、総損失 13.393 MW が一致
- **WSCC 9母線**: 全母線電圧が既知解と一致、総損失 4.641 MW が一致
- **全アルゴリズム**: NR・GS・FDXB が同一解に収束することを相互検証

検証テストの実行:

```bash
node tests/verify_algorithms.mjs   # ① エンジン単体: MATPOWER基準解との照合 (22テスト)
python3 tests/check_pages.py       # ② 全ページのJSエラー検出 (要 playwright)
python3 tests/check_numerics.py    # ③ E2E数値回帰: 各ツールを駆動し核心数値を検証 (21テスト)
```

三層の検証体制: エンジンの数学 → ページの動作 → 画面に出る数値、をそれぞれ別のテストが守ります。

## 📈 収録系統データ（MATPOWER v2形式）

| 系統 | 母線数 | 枝数 | 発電機数 | 特徴 |
|---|---|---|---|---|
| 2-bus | 2 | 1 | 1 | 最小構成（学習用） |
| 5-bus | 5 | 7 | 2 | 基本系統（学習用） |
| WSCC 9-bus | 9 | 9 | 3 | 3機9母線・過渡安定度研究の古典 |
| IEEE 14-bus | 14 | 20 | 5 | 標準テスト系統（AEP 1962年系統の一部） |
| IEEE 30-bus | 30 | 41 | 6 | 中規模系統（AEP 1961年系統の一部） |

14/30母線はMATPOWERのcase14/case_ieee30と同一データ、9母線はWSCC標準（古典解と一致検証済み）です。2/5母線は教育用の簡易系統です。

## 📁 プロジェクト構造

```
pf-vis/
├── index.html                            # メインページ（学習パス・ツール一覧）
├── power_flow_intuitive_v6_fixed.html    # 1. 収束過程直感的理解（入門）
├── power_flow_process_visualizer_v2.html # 2. 計算過程ステップ表示（基礎）
├── power_flow_compare.html               # 3. アルゴリズム同時比較（比較）
├── power_flow_matpower_v2.html           # 4. MATPOWER準拠実装（実践）
├── power_flow_v5.html                    # 5. 統合分析スイート（発展）
├── dc_accuracy_analysis.html             # 6. DC潮流精度検証（応用）
├── power_flow_visualizer.html            # 補助: 多手法可視化
├── getting_started.html                  # Step 0: はじめに (前提知識・用語集)
├── exercises.html                        # 演習問題 (全18問・自動判定つき)
├── scripts/
│   ├── ieee_cases.js                     # IEEE標準系統データ（MATPOWER準拠・検証済み）
│   ├── power_flow_engine.js              # 潮流計算エンジン（NR/GS/FDXB/DC）
│   ├── power_flow_utils.js               # 複素数・行列演算ユーティリティ
│   ├── learning_nav.js                   # 全ページ共通の学習ガイドバー
│   └── main.js                           # メインページ用スクリプト
├── styles/main.css                       # 共通スタイル
├── tests/
│   ├── verify_algorithms.mjs             # ① エンジン照合テスト (22)
│   ├── check_pages.py                    # ② 全ページJSエラー検出
│   ├── check_numerics.py                 # ③ E2E数値回帰テスト (21)
│   └── verify_ieee14_algorithms.html     # ブラウザ版検証ページ
├── docs/                                 # 各ツールの技術文書
└── archive/                              # 旧バージョン（参照用・保守対象外）
```

> **注**: 一部のツール（compare / v5 / process_visualizer_v2 / intuitive）は教育目的で
> 計算ロジックをページ内に自己完結して実装しています。共有エンジンを使うのは
> matpower_v2 / dc_accuracy_analysis です。系統データはいずれもMATPOWER準拠に統一しています。

## 🔧 技術仕様

- **実装**: HTML5 + CSS3 + Vanilla JavaScript（フレームワーク・外部ライブラリ非依存）
- **数値計算**: 独自実装 — LU分解（部分ピボット選択）+ 前進後退代入、極形式ヤコビアン
- **可視化**: Canvas API による独自描画
- **対応ブラウザ**: Chrome / Firefox / Safari / Edge の各最新版（ES6+）

### ローカル実行

```bash
git clone https://github.com/lutelute/pf-vis.git
cd pf-vis
python3 -m http.server 8093   # 任意のHTTPサーバでOK
open http://localhost:8093/
```

## 📚 参考文献

1. Bergen, A.R., Vittal, V. *Power Systems Analysis*, 2nd ed., Prentice Hall, 2000
2. Grainger, J.J., Stevenson, W.D. *Power System Analysis*, McGraw-Hill, 1994
3. Stott, B., Alsac, O. "Fast Decoupled Load Flow", *IEEE Trans. Power App. Syst.*, 1974
4. Zimmerman, R.D., Murillo-Sánchez, C.E., Thomas, R.J. "MATPOWER: Steady-State Operations, Planning and Analysis Tools for Power Systems Research and Education", *IEEE Trans. Power Syst.*, 2011
5. Anderson, P.M., Fouad, A.A. *Power System Control and Stability*, IEEE Press, 2003（WSCC 9母線系統）
6. Trias, A. "The Holomorphic Embedding Load Flow Method", *IEEE PES General Meeting*, 2012

## 🔄 更新履歴（主要）

- **2026-07-25**: 正確性の全面見直し・教材強化
  - 共有エンジンの構文エラー修正（エンジンが読み込めない状態を解消）
  - Gauss-SeidelのPV母線処理を修正（Q注入を反復ごとに再計算）
  - 高速分離法B′行列・DC潮流B行列を正しい定式化（1/x のみ）に修正
  - IEEE 14母線の枝7-9データ誤り、WSCC 9母線の負荷配置誤りを修正
  - MATPOWER解との照合テストを整備（22テスト）・重複ファイル整理・教材構成に再編
  - 計算過程ステップ表示に**実数値ヤコビアン**を追加: 各要素をクリックすると
    計算式・代入値・物理的な意味（「この母線の角度を1°進めると何MW変わるか」等）を表示。
    FD法のB′/B″・DC潮流のB行列も実数値で表示し、ミスマッチ・修正量もMW換算＋解釈付きに
- **2026-01**: 共有モジュール化（ieee_cases / power_flow_engine / power_flow_utils）、JSDoc整備
- **2024-12**: 各可視化ツールの初版〜v2/v6系列の開発

## 📝 ライセンス

教育目的のプロジェクトです。MATPOWERプロジェクトおよびIEEE標準系統データの
先駆的な研究・公開に深く感謝します。

---

**リポジトリ**: https://github.com/lutelute/pf-vis
**旧リポジトリ** (power_flow_viz) から移行しました。
