/**
 * Learning Navigation Bar
 *
 * @fileoverview 各ツールページの先頭に「学習目標・前後の導線・対応する演習」を
 * 表示する共通ナビゲーション。学習パス(index.html)の文脈を各ページ内でも保つ。
 *
 * 使い方: 各ツールページで <script src="scripts/learning_nav.js"></script> を
 * 読み込むだけ。ページはファイル名から自動判別する。
 */
(function () {
    'use strict';

    var PATH = {
        'power_flow_intuitive_v6_fixed.html': {
            stage: '入門', order: '1 / 6',
            goals: [
                '潮流計算が「非線形方程式の反復解法」であることを体感する',
                '解に近づく軌跡と、収束・非収束の違いを見分けられるようになる',
                '負荷が重いほど解きにくくなる（電圧崩壊に近づく）ことを観察する'
            ],
            prev: { href: 'getting_started.html', label: 'はじめに' },
            next: { href: 'power_flow_process_visualizer_v2.html', label: '基礎: 計算過程ステップ表示' },
            exercise: 'Stage 1'
        },
        'power_flow_process_visualizer_v2.html': {
            stage: '基礎', order: '2 / 6',
            goals: [
                'NR法の1反復（ミスマッチ→ヤコビアン→求解→更新）を式と数値で追う',
                'ヤコビアンの各要素をクリックし、数値の物理的意味を言えるようになる',
                '対角ブロックが大きい＝Fast Decoupled法の分離根拠を数値で確認する'
            ],
            prev: { href: 'power_flow_intuitive_v6_fixed.html', label: '入門: 収束過程直感的理解' },
            next: { href: 'power_flow_compare.html', label: '比較: アルゴリズム同時比較' },
            exercise: 'Stage 2〜3'
        },
        'power_flow_compare.html': {
            stage: '比較', order: '3 / 6',
            goals: [
                '2次収束(NR)と線形収束(GS)の違いを「真の解への距離」チャートで見る',
                '実測収束次数 p（NR≈2, GS≈1）を確認する',
                '「上限到達(未収束)」と「発散」を区別できるようになる'
            ],
            prev: { href: 'power_flow_process_visualizer_v2.html', label: '基礎: 計算過程ステップ表示' },
            next: { href: 'power_flow_matpower_v2.html', label: '実践: MATPOWER準拠実装' },
            exercise: 'Stage 4'
        },
        'power_flow_matpower_v2.html': {
            stage: '実践', order: '4 / 6',
            goals: [
                'MATPOWER形式のデータでIEEE標準系統を解けるようになる',
                '電力収支（総発電=総負荷+総損失）で解の妥当性を検算する',
                '実数値ヤコビアンと母線結果表を読み解く'
            ],
            prev: { href: 'power_flow_compare.html', label: '比較: アルゴリズム同時比較' },
            next: { href: 'power_flow_v5.html', label: '発展: 統合分析スイート' },
            exercise: 'Stage 5'
        },
        'power_flow_v5.html': {
            stage: '発展', order: '5 / 6',
            goals: [
                '発展手法（LM法・緩和NR等）と基本手法の関係を理解する',
                '8手法の収束特性・頑健性のトレードオフを比較する'
            ],
            prev: { href: 'power_flow_matpower_v2.html', label: '実践: MATPOWER準拠実装' },
            next: { href: 'dc_accuracy_analysis.html', label: '応用: DC潮流精度検証' },
            exercise: 'Stage 4〜5'
        },
        'dc_accuracy_analysis.html': {
            stage: '応用', order: '6 / 6',
            goals: [
                'DC近似の誤差を定量化し、適用限界を判断できるようになる',
                'Q注入と電圧偏差の関係から「DCが捨てている情報」を理解する'
            ],
            prev: { href: 'power_flow_v5.html', label: '発展: 統合分析スイート' },
            next: { href: 'exercises.html', label: '演習問題で総仕上げ' },
            exercise: 'Stage 6'
        },
        'power_flow_visualizer.html': {
            stage: '補助', order: '—',
            goals: [
                '実装済み4手法を実データで実行し、多様な手法の分類を俯瞰する',
                '未実装手法は数式カタログとして参照する（実行結果は表示されない）'
            ],
            prev: { href: 'index.html', label: 'メインページ' },
            next: { href: 'exercises.html', label: '演習問題' },
            exercise: null
        }
    };

    var file = (location.pathname.split('/').pop() || 'index.html');
    var cfg = PATH[file];
    if (!cfg) return;

    // スタイル (1回だけ)
    var css = document.createElement('style');
    css.textContent =
        '.lnav{background:#fffdf6;border:1px solid #dcd8cc;border-left:3px solid #197b6c;' +
        'border-radius:8px;margin:10px 16px;font-family:"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif;font-size:13px;color:#52504a;}' +
        '.lnav summary{cursor:pointer;padding:8px 14px;user-select:none;color:#197b6c;font-weight:600;' +
        'display:flex;align-items:center;gap:10px;flex-wrap:wrap;list-style:none;}' +
        '.lnav summary::-webkit-details-marker{display:none}' +
        '.lnav summary .lnav-links{margin-left:auto;display:flex;gap:14px;font-weight:500;}' +
        '.lnav a{color:#197b6c;text-decoration:none;}' +
        '.lnav a:hover{text-decoration:underline;}' +
        '.lnav .lnav-body{padding:2px 16px 12px;border-top:1px solid #dcd8cc;}' +
        '.lnav ul{margin:8px 0 4px 20px;line-height:1.9;}' +
        '.lnav .lnav-ex{color:#737166;font-size:12px;margin-top:6px;}';
    document.head.appendChild(css);

    var nav = document.createElement('details');
    nav.className = 'lnav';
    var goalsHtml = cfg.goals.map(function (g) { return '<li>' + g + '</li>'; }).join('');
    var exHtml = '<div class="lnav-ex">' +
        (cfg.exercise ? '✏️ 対応する演習: <a href="exercises.html">' + cfg.exercise + '</a>　' : '') +
        '📖 <a href="getting_started.html#glossary">用語・記号の早見表</a></div>';
    nav.innerHTML =
        '<summary>🎓 学習ガイド【' + cfg.stage + ' ' + cfg.order + '】このページの学習目標 ▾' +
        '<span class="lnav-links">' +
        '<a href="' + cfg.prev.href + '">← ' + cfg.prev.label + '</a>' +
        '<a href="' + cfg.next.href + '">' + cfg.next.label + ' →</a>' +
        '</span></summary>' +
        '<div class="lnav-body"><ul>' + goalsHtml + '</ul>' + exHtml + '</div>';

    // ナビバーがあればその直後、なければbody先頭に挿入
    function insert() {
        var anchor = document.querySelector('.nav-bar, nav');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(nav, anchor.nextSibling);
        } else {
            document.body.insertBefore(nav, document.body.firstChild);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insert);
    } else {
        insert();
    }
})();
