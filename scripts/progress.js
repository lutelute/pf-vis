/**
 * progress.js — 学習進捗の共通アダプター
 *
 * 既存の保存キー（変更しない・削除しない）:
 *   pfvis_ladder_<k>   … 各ラダー段の昇級課題 {q1,q2,q3}（k = l0,l1,l2,bridge,l5,l6）
 *   pfvis-exercises    … 演習の自動判定結果 {qN: {ok:bool}}（自動判定は22入力欄）
 * 新規キー（このアダプターだけが書く）:
 *   pfvis.progress.v1  … { lastVisited: {href,title,ts} }
 *
 * 注意（設計判断）:
 *  - ラダーは「採点できる6段」、演習は「自動判定22入力欄」を分母にする。
 *    合算して1つの%にしない（意味の違う量なので）
 *  - localStorage不可・壊れたJSONは常に許容（全て try/catch）
 *  - 進捗は「この端末のブラウザに保存」— 別端末・別ドメインでは共有されない
 */
(function () {
    'use strict';

    var LADDER_KEYS = ['l0', 'l1', 'l2', 'bridge', 'l5', 'l6'];
    var V1_KEY = 'pfvis.progress.v1';

    function readJson(key) {
        try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function ladderFlags() {
        var flags = {};
        LADDER_KEYS.forEach(function (k) {
            var s = readJson('pfvis_ladder_' + k);
            flags[k] = !!(s.q1 && s.q2 && s.q3);
        });
        return flags;
    }

    function summary() {
        var flags = ladderFlags();
        var ladderDone = LADDER_KEYS.filter(function (k) { return flags[k]; }).length;
        var ex = readJson('pfvis-exercises');
        var exDone = Object.keys(ex).filter(function (k) { return ex[k] && ex[k].ok; }).length;
        var v1 = readJson(V1_KEY);
        return {
            ladderDone: ladderDone, ladderTotal: LADDER_KEYS.length, ladderFlags: flags,
            exDone: exDone, exTotal: 22,
            lastVisited: v1.lastVisited || null,
            isNew: ladderDone === 0 && exDone === 0 && !v1.lastVisited
        };
    }

    function recordVisit(title) {
        try {
            var v1 = readJson(V1_KEY);
            v1.lastVisited = {
                href: (location.pathname.split('/').pop() || 'index.html'),
                title: title || document.title,
                ts: Date.now()
            };
            localStorage.setItem(V1_KEY, JSON.stringify(v1));
        } catch (e) { /* 保存不可環境では何もしない */ }
    }

    window.PFVisProgress = { summary: summary, recordVisit: recordVisit, LADDER_KEYS: LADDER_KEYS };
})();
