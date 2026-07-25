# pf-vis 講演スタイル教材 — ブループリント仕様

[lutelute/process_nn](https://github.com/lutelute/process_nn) の `docs/BLUEPRINT.md` を潮流計算教材に適合させた仕様。
既存の「ツール型」ページ（自由に操作する）を補完する、**「講演型」ページ（章立てスライドで1本の物語を通す）**の作り方を定める。

## 1. 素材リスト（講演型ページの計画）

| slug | タイトル | 1枚で言う核心 | 実計算・A/B対比 |
|---|---|---|---|
| `learn_newton.html` | Newton-Raphson潮流計算 — 解けない方程式を、傾きで解く | 非線形を一発で解く魔法はない。「今の場所の傾きで線形化→解く」の反復がNR。誤差の桁が倍々で減る | 2母線を実NRで解く（J=[[15,5],[−5,15]]を導出込みで実計算）。**A/B: NRの崖 vs GSの直線（対数収束曲線）**、🎲で負荷可変 |
| `learn_gs.html`（計画） | Gauss-Seidel — 1母線ずつの往復 | 連立を解かず、1母線ずつ「自分の式だけ」満たすよう更新して回る。遅いが軽い | 実GSの逐次更新をアニメ表示。**A/B: 加速係数 1.0 vs 1.6** |
| `learn_dc.html`（計画） | DC潮流 — 割り切りの技術 | V=1・sinθ=θ・損失無視と割り切ると一次方程式に落ちる。速さと引き換えに何を失うか | 実AC解とDC解の同時計算。**A/B: 軽負荷（誤差小）vs 重負荷（誤差拡大）** |
| `learn_collapse.html`（計画） | 電圧崩壊 — 解が消える瞬間 | 負荷を増やすと2つあった解が近づき、合体して消える（PV曲線のノーズ） | 実PV曲線トレース。**A/B: ノーズ手前 vs 先の初期値依存性** |

## 2. ページ構造仕様（ブループリント）

**参照実装**: `learn_newton.html`（本リポジトリ）/ 原典は process_nn の `viz/gnnflow.html`。

### 2.1 ページ骨格（順序固定）
```
<head> inline style（和紙風ライトテーマ。ツール型のダークとあえて変える）
<body><div class="wrap">
  <div class="nav">        ← pf-vis 内の関連ページへの静的リンク
  <div class="lecture-tag"> ← 「⚡ 講演 — 全N枚」
  <h1>タイトル</h1>
  <div class="lead">       ← 導入2〜3文（<b>強調</b>・関連ページ<a>リンク）
  <div class="purpose">    ← 3行固定: なぜ学ぶ? / 一言で言うと / どこで使われる?
  <div class="stage">
    <div class="stepper">  ← 章タブ（3〜4章、進捗表示）
    <div class="body"> = <div class="vis">canvas 360×430 + mini + legend</div>
                        + <div class="explain">スライド本文</div>
    <div class="bar">      ← ◀前へ / 次へ▶(primary) / ⏵自動 / ↻最初から / (🎲等)
  <div class="aha">        ← 💡 見方が変わる一文（1文）
  <div class="myth">       ← ⚠ よくある誤解（✗→✓ を2組）
  <details>もっと詳しく</details>
```

### 2.2 スライドエンジン
- `const CHAPTERS=[{t,c,start},…]`（3〜4章）、`const SLIDES=[{title,legend,html(),draw(),dice?},…]`（13〜16枚）
- `html()` は `<h3>`＋`.eq.curr`（数式）＋`.desc`（本文）。**ライブ値**（反復回数・誤差・V・δ等）を文中に埋め込む
- `draw()` はcanvasに描画。`renderAll()/goSlide()/autoTick()` は learn_newton.html の制御を流用
- 初期表示は**静止**（1枚目）。「次へ ▶」で誘導

### 2.3 実装規約
- **実計算necessity**: 見せかけ禁止。その場で本当に解く（NR・GS・DC・ミスマッチ等高線まで全て実計算）
- **乱数**: `Math.random()` 禁止。シード付き `rng()`（mulberry32）。🎲はseedを進めて再計算
- **数式**: `.eq` 内は `<i>変数</i>`・`<sub>` を使い、**必ず `<span class="read">読み：…</span>` の読み下し行**を付ける
- **数値の検証**: 埋め込む固定数値（IEEE14の損失13.393MW等）は本リポジトリの検証済みテストの値のみ。
  ページ内ライブ値はページ内の実計算から取る
- **アクセシビリティ**: `prefers-reduced-motion` でアニメをスキップし最終状態を描く
- **外部依存ゼロ**: ライブラリ・画像・fetch禁止。完全自己完結
- **文体**: です・ます調。専門語に平易な言い換えを添える。**1枚1核心**。盛らない
- **A/B対比**: 必ず1枚以上（平均的な見せ方より条件対比で本質を見せる）
- **相互リンク**: 既存ツール（process_v2のJ解剖・compareの距離チャート等）と演習Stageへ張る
- **コメント内の数式**: `S*/V*` のような `*/` を含む表記は禁止（構文エラー再発防止メモ#1）

### 2.4 登録4面（ページ追加時に必ず）
1. `index.html` の講演カード、2. `README.md` の一覧、3. `tests/check_pages.py`、4. `tests/check_numerics.py`（核心数値のE2Eアサート）

## 3. 充実ループ＋検証ループのプロトコル

初版（章立て＋動く版）を作った後、充実Lと検証Vを交互に回し、`docs/quality_rubric.md` に記録する。

| # | 充実ループ L | 検証ループ V |
|---|---|---|
| 1 | スライドを13〜16枚に拡張、各枚の焦点を1つに | `node --check`（script抽出）＋ check_pages |
| 2 | 全スライドに数式`.eq`＋`.read`読み下し | 数式の記号・符号・次元を教科書と突き合わせ |
| 3 | 実計算コアの質（収束・ライブ値の実況） | **コアをNodeに抽出して実行**、数値をログに記録 |
| 4 | canvas描画の質（A/B対比・アニメ） | Playwrightで全スライドをクリック通し、error 0件 |
| 5 | 実例・物語（実務の数字・既存ページとの接続） | リンク先の実在確認 |
| 6 | purpose/aha/myth/legend/miniの磨き込み | reduced-motion・コントラスト点検 |
| 7 | 全文推敲（1枚1核心・冗長削除） | 三層テスト＋全枚通し読みで論理の飛び確認 |
