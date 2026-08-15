# アルゴリズム実装一覧（メンテナンス用）

本リポジトリ内の潮流計算実装の所在と検証状態の一覧。2026-07-25の正確性見直し後の状態。

## 共有エンジン `scripts/power_flow_engine.js`

全ページの基準実装。MATPOWER公式解と照合検証済み（`tests/verify_algorithms.mjs`, 22テスト）。

| コード | 手法 | 実装メソッド | 備考 |
|---|---|---|---|
| `nr` | Newton-Raphson（極座標） | `_solveNewtonRaphsonStep` | 完全ヤコビアン+LU |
| `gs` | Gauss-Seidel | `_solveGaussSeidelStep` | PV母線Qは`_calcQInjectionAt`で毎回推定。`acceleration`オプションあり |
| `fdxb` | Fast Decoupled XB | `_solveFastDecoupledStep` | B′=`_buildBPrime`(1/xのみ)、B″=`_buildBMatrix`(-Im Ybus) |
| `dc` | DC潮流 | `_solveDC` | B=`_buildBPrime(buses, true)`（1/(x·τ)） |

利用ページ: `power_flow_matpower_v2.html` / `dc_accuracy_analysis.html` / `power_flow_visualizer.html` / `power_flow_simulator.html`

### solveWithTrace API（2026-08-15 追加）

シミュレータ用に `solveWithTrace({algorithm, tolerance, maxIterations, subSteps})` を追加。
solve() と同じ反復・同じ収束判定で解きながら全母線状態のスナップショット列（trace）を返す。
`subSteps: true` で GS は1母線更新ごと・FDXB は半反復ごとに記録。
内部は `_gsUpdateBus` / `_fdApplyAngleHalf` / `_fdApplyVoltageHalf` / `_calcStepResult` の
**純粋抽出**（挙動不変）で実現しており、solve() との反復回数・解の完全一致を
`tests/verify_algorithms.mjs` の「🎞 solveWithTrace」9テストで恒久的に担保している。
**可視化ページはこの trace を再生するだけにすること**（アニメーションのための計算再実装は
見せかけ実装バグ#6/#13 の温床。トレース再生ならば構造的に混入しない）。

## 自己完結実装を持つページ

| ページ | 手法数 | 内容 |
|---|---|---|
| `power_flow_v5.html` | 8 | nr, fdxb, fdbx, gs, gj, dc, lm（JᵀJ+μI）, rnr（緩和NR） |
| `power_flow_compare.html` | 8 | 同上（ステップ表示付き） |
| `power_flow_process_visualizer_v2.html` | 5 | NR, GS, FD, DC, Gauss(Jacobi)。簡略系統データ内蔵 |
| `power_flow_intuitive_v6_fixed.html` | 4 | NR, GS, 勾配降下, DC。2〜30ノードの教育用問題 |

これらはエンジンと同じ定式化（B′は1/xのみ、GS/GJのPV母線Q推定、真のLM）に統一済み。

## 2026-07-25 に修正した既知バグ（再発防止メモ）

1. **ブロックコメント内の `S*/V*`** が `*/` としてコメントを閉じ、ファイル全体を構文エラーにする
   （engine と intuitive_v6_fixed で発生）。数式コメントでは `S* / V*` と空白を入れること
2. **GS/GJ の PV母線**で `Qspec = 0` としていた（Qは毎回推定が正しい）
3. **B′/DC の B行列**を `-Im(Ybus)` から作っていた（シャント・充電容量が混入。1/xのみが正しい）
4. **IEEE 14 の枝7-9** データ誤り（r=0.11001, x=0.2064 → 正: r=0, x=0.11001）
5. **WSCC 9母線の負荷配置**がトポロジと不整合（負荷は5/7/9が正しい）
6. **偽装実装**: 「HELM」が実態は緩和NR → RNRに改称。「LM」が J+λI → JᵀJ+μI に修正。
   `power_flow_visualizer.html` の乱数による疑似収束曲線 → 廃止（実計算4手法+解説カタログに）
7. **DC潮流で|V|=1.0を設定し忘れ**（v5/compare）→ 角度だけ更新し電圧が初期値のまま表示されていた
8. **捏造系統データ**: v5の「IEEE 57/118」は乱数・簡略生成の合成データだった
   →「合成系統」と正直に改名（実データが必要なら `scripts/ieee_cases.js` の検証済み系統を使う）
9. **変圧器from側の充電容量 b/2 が tap² で除されていなかった**（MATPOWER: Yff=(y+jb/2)/τ²。
   同梱ケースはタップ付き枝のb=0のため顕在化していなかった潜在バグ）
10. **反復上限到達を「発散」と表示**（v5/compare）→ 「上限到達(未収束)」と区別。
    GSが正常収束するのに「発散」と教える誤りを解消
11. **intuitive_v6_fixed の数値バグ4件**: GS更新式が S*/V（正: S*/V*、分母も共役）、
    DC潮流の符号逆転、生成系統のYbus符号規約逆転（誘導性なのに対角虚部が正）、
    NRの常時0.7倍ダンピング（2次収束が線形化）→ バックトラッキング直線探索に変更
12. **process_visualizer_v2 のデータ誤り**: PV母線の負荷が脱落（14busで総負荷が半分）、
    変圧器タップ未対応、9busの充電容量が実質1/4（B/2値にさらにb/2）、30busの定数2件
13. **DC潮流のフェイク実行**（process_v2）: 線形方程式を解かずJacobi 1回スイープ、
    収束履歴に tolerance/10 の偽値をpush → 直接求解+偽値廃止
14. **dc_accuracy の集計論理**: スラックP誤差が常に0（指定PGと比較していた→解いた注入と比較）、
    「Qミスマッチ」（収束済みなら定義上0）で結論 → Q注入と電圧偏差の分析に変更
15. **v5の「IEEE 57/118」データ**: b列シフト説（他エージェント指摘）は検証の結果**棄却**
    （現データでMATPOWER解と完全一致）。ただし57/118自体は合成データのため正直に改名済み

## 検証手順

```bash
node tests/verify_algorithms.mjs    # ① エンジン単体: MATPOWER基準解との照合 (22)
python3 -m http.server 8093 &
python3 tests/check_pages.py        # ② 全ページのJSエラー検出
python3 tests/check_numerics.py     # ③ E2E数値回帰: ツールを駆動し核心数値を検証 (21)
```
