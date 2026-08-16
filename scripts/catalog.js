/**
 * catalog.js — 全教材の共通カタログ（単一の情報源）
 *
 * トップ（ダッシュボード）と検証テストがここから読む。教材の追加・改名は
 * このファイルと map.html の座標つき配列（M）の両方に反映し、
 * tests/check_numerics.py の「カタログ⇔map 整合」テストで守る。
 *
 * kind: guide(案内) / tool(ツール) / lecture(講義) / ladder(ラダー) / drill(演習)
 * stage: ツールの段階 0=横断ハブ, 1=感覚をつかむ, 2=内部を読む, 3=違いを比べる, 4=実務と限界
 * type:  ツールの種類バッジ（何をするものか）
 */
(function () {
    'use strict';

    window.PFVIS_CATALOG = [
        // ---- 案内 ----
        { id: 'start', kind: 'guide', title: 'はじめに', href: 'getting_started.html',
          blurb: '前提知識・用語・最初の5分' },

        // ---- ツール8種 ----
        { id: 'simulator', kind: 'tool', stage: 0, type: 'トレース再生',
          title: 'アルゴリズム・シミュレータ', href: 'power_flow_simulator.html',
          blurb: '計算の全記録を再生。単独／レース／網羅の3モード' },
        { id: 'intuitive', kind: 'tool', stage: 1, type: '体感',
          title: '収束過程直感的理解', href: 'power_flow_intuitive_v6_fixed.html',
          blurb: '複素電圧平面の軌跡と誤差曲面で反復解法を体感' },
        { id: 'process', kind: 'tool', stage: 2, type: '解剖',
          title: '計算過程ステップ表示', href: 'power_flow_process_visualizer_v2.html',
          blurb: 'NR1反復を6段階で解剖。実数値ヤコビアン' },
        { id: 'compare', kind: 'tool', stage: 3, type: '比較',
          title: 'アルゴリズム同時比較', href: 'power_flow_compare.html',
          blurb: '8手法を同一条件で同時実行。実測収束次数p' },
        { id: 'visualizer', kind: 'tool', stage: 3, type: '探索・カタログ',
          title: '多手法可視化', href: 'power_flow_visualizer.html',
          blurb: '各手法を個別にじっくり実行・観察' },
        { id: 'matpower', kind: 'tool', stage: 4, type: '実行・検算',
          title: 'MATPOWER準拠実装', href: 'power_flow_matpower_v2.html',
          blurb: '実務標準データ形式で解く。電力収支検算つき' },
        { id: 'v5', kind: 'tool', stage: 4, type: '横断分析',
          title: '統合分析スイート', href: 'power_flow_v5.html',
          blurb: 'LM・連続潮流等を含む8手法の横断分析' },
        { id: 'dcacc', kind: 'tool', stage: 4, type: '近似検証',
          title: 'DC潮流精度検証', href: 'dc_accuracy_analysis.html',
          blurb: '線形近似の誤差をAC解と比較して定量化' },

        // ---- 講義4本 ----
        { id: 'ln_nr', kind: 'lecture', title: 'NR講演（16枚）', href: 'learn_newton.html',
          blurb: '解けない方程式を、傾きで解く' },
        { id: 'ln_gs', kind: 'lecture', title: 'GS講演（14枚）', href: 'learn_gs.html',
          blurb: '連立を解かずに、1母線ずつ' },
        { id: 'ln_dc', kind: 'lecture', title: 'DC講演（13枚）', href: 'learn_dc.html',
          blurb: '割り切りの技術' },
        { id: 'ln_cl', kind: 'lecture', title: '崩壊講演（13枚）', href: 'learn_collapse.html',
          blurb: '解が消える瞬間' },

        // ---- ラダー6段（橋を含む） ----
        { id: 'l0', kind: 'ladder', prog: 'l0', title: 'L0 釣り合い', href: 'ladder_l0.html',
          blurb: '電気はためられない' },
        { id: 'l1', kind: 'ladder', prog: 'l1', title: 'L1 高圧送電', href: 'ladder_l1.html',
          blurb: '50万ボルトを使う理由' },
        { id: 'l2', kind: 'ladder', prog: 'l2', title: 'L2 フェーザ', href: 'ladder_l2.html',
          blurb: '回る矢印と2つの電力' },
        { id: 'bridge', kind: 'ladder', prog: 'bridge', title: '橋 複素数', href: 'ladder_bridge.html',
          blurb: '回る矢印を代数にする' },
        { id: 'l5', kind: 'ladder', prog: 'l5', title: 'L5 PV曲線', href: 'ladder_l5.html',
          blurb: '解が消える点を追跡' },
        { id: 'l6', kind: 'ladder', prog: 'l6', title: 'L6 研究入口', href: 'ladder_l6.html',
          blurb: '収束の地図と開いている問い' },

        // ---- 演習 ----
        { id: 'ex', kind: 'drill', title: '演習問題（全18問）', href: 'exercises.html',
          blurb: '手計算・ツール操作・考察。自動判定22入力欄' },
    ];

    window.PFVIS_COUNTS = {
        total: window.PFVIS_CATALOG.length,               // 20
        tools: window.PFVIS_CATALOG.filter(function (m) { return m.kind === 'tool'; }).length,
        lectures: window.PFVIS_CATALOG.filter(function (m) { return m.kind === 'lecture'; }).length,
        ladders: window.PFVIS_CATALOG.filter(function (m) { return m.kind === 'ladder'; }).length,
    };
})();
