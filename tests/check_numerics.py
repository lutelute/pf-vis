#!/usr/bin/env python3
"""数値回帰テスト - 各ツールページを実際に駆動し、教材の核心数値を検証する。

check_pages.py が「JSエラーがないか」を見るのに対し、このテストは
「計算結果が正しいか」（MATPOWER基準値・既知解との一致）をページごとに検証する。

使い方:
    python3 -m http.server 8093 &      # リポジトリルートで実行
    python3 tests/check_numerics.py [port]

検証項目（すべて外部基準に照合済みの値）:
- intuitive:  NR 4反復収束 / V=0.9888 / DC δ=-0.955° / 実測次数 p≈2
- process_v2: 簡略14bus の bus3 が δ≈-12.77°（MATPOWER -12.73°の近傍）
- compare:    NR損失 4.641 MW (WSCC9) / 実測次数 NR p≈2, GS p≈1 / 真の解基準あり
- v5:         NR収束 + 電力収支残差 < 0.01 MW
- matpower_v2: 電力収支検算 ✓ / 損失が基準値と一致
- dc_accuracy: 角度誤差 平均 < 1°
"""
import sys

from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8093"
BASE = f"http://localhost:{PORT}"

passed = 0
failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        print(f"  ✅ {name}")
        passed += 1
    else:
        print(f"  ❌ {name}  {detail}")
        failed += 1


def run_and_wait(page, done_js, timeout_ms=40000):
    """実行ボタンを押し、done_js が真になるまで待つ"""
    page.evaluate("""() => {
        const btn = [...document.querySelectorAll('button')].find(b => /同時実行|実行|Run/i.test(b.textContent));
        if (btn) btn.click();
    }""")
    page.wait_for_function(done_js, timeout=timeout_ms)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # ---------- intuitive_v6_fixed ----------
        print("\n■ 収束過程直感的理解 (intuitive_v6_fixed)")
        page.goto(f"{BASE}/power_flow_intuitive_v6_fixed.html")
        run_and_wait(page, "() => /反復で収束しました/.test(document.body.innerText)")
        r = page.evaluate("""() => ({
            text: document.body.innerText,
            V: state.V, deltaDeg: state.delta * 180 / Math.PI,
            dcDeg: state.dcSolution ? state.dcSolution.delta * 180 / Math.PI : null,
            iter: state.iteration
        })""")
        check("NR 4反復で収束", r["iter"] == 4, f"iter={r['iter']}")
        check("V = 0.9888 ± 0.002", abs(r["V"] - 0.9888) < 0.002, f"V={r['V']:.4f}")
        check("δ = -0.753° ± 0.02", abs(r["deltaDeg"] + 0.753) < 0.02, f"δ={r['deltaDeg']:.3f}")
        check("DC解 δ = -0.955° ± 0.02", abs(r["dcDeg"] + 0.955) < 0.02, f"dc={r['dcDeg']}")
        check("実測収束次数を表示 (2次)", "実測収束次数" in r["text"] and "2次収束" in r["text"])

        # ---------- process_visualizer_v2 (簡略14bus) ----------
        print("\n■ 計算過程ステップ表示 (process_v2, 簡略14bus)")
        page.goto(f"{BASE}/power_flow_process_visualizer_v2.html")
        page.evaluate("""() => {
            const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === '14bus'));
            sel.value = '14bus'; sel.dispatchEvent(new Event('change'));
        }""")
        page.wait_for_timeout(500)
        run_and_wait(page, "() => /✓ 収束!/.test(document.body.innerText)")
        r = page.evaluate("""() => ({
            v3: state.buses[2].V, d3: state.buses[2].delta * 180 / Math.PI,
            maxMis: Math.max(...state.buses.filter(b => b.type !== 'Slack').map((b, i) => 0))
        })""")
        check("bus3 δ ≈ -12.77° ± 0.3 (真値-12.73°)", abs(r["d3"] + 12.77) < 0.3, f"δ3={r['d3']:.2f}")
        check("bus3 |V| ≈ 1.010 ± 0.01", abs(r["v3"] - 1.010) < 0.01, f"V3={r['v3']:.4f}")

        # ---------- compare (WSCC9) ----------
        print("\n■ アルゴリズム同時比較 (compare, WSCC9)")
        page.goto(f"{BASE}/power_flow_compare.html")
        page.evaluate("() => { document.getElementById('maxIterInput').value = 300; }")
        run_and_wait(page, "() => typeof running !== 'undefined' && !running && engines.nr && engines.nr.converged",
                     timeout_ms=90000)
        r = page.evaluate("""() => ({
            nrConv: engines.nr.converged, nrIter: engines.nr.iteration,
            loss: computeTotalLossMW(engines.nr),
            pNR: estimateConvergenceOrder(engines.nr),
            pGS: engines.gs && engines.gs.converged ? estimateConvergenceOrder(engines.gs) : null,
            hasRef: !!refSolution,
            bal: computeBalanceMW(engines.nr).residual
        })""")
        check("NR収束", r["nrConv"])
        check("NR損失 = 4.641 ± 0.01 MW (MATPOWER一致)", abs(r["loss"] - 4.641) < 0.01, f"loss={r['loss']:.3f}")
        check("実測次数 NR p ∈ [1.6, 2.6]", r["pNR"] and 1.6 <= r["pNR"] <= 2.6, f"p={r['pNR']}")
        check("実測次数 GS p ∈ [0.8, 1.2]", r["pGS"] and 0.8 <= r["pGS"] <= 1.2, f"p={r['pGS']}")
        check("真の解(基準)が存在", r["hasRef"])
        check("電力収支残差 < 0.01 MW", abs(r["bal"]) < 0.01, f"res={r['bal']:.2e}")

        # ---------- v5 ----------
        print("\n■ 統合分析スイート (v5)")
        page.goto(f"{BASE}/power_flow_v5.html")
        run_and_wait(page, "() => typeof running !== 'undefined' && !running && engines.nr && engines.nr.converged",
                     timeout_ms=60000)
        r = page.evaluate("""() => ({
            caseName: document.querySelector('select').value,
            nrIter: engines.nr.iteration,
            bal: computeBalanceMW(engines.nr),
        })""")
        expected_loss = {"case9": 4.641, "case14": 13.393}.get(r["caseName"])
        check("NR収束 (反復 ≤ 8)", r["nrIter"] <= 8, f"iter={r['nrIter']}")
        check("電力収支残差 < 0.01 MW", abs(r["bal"]["residual"]) < 0.01, f"res={r['bal']['residual']:.2e}")
        if expected_loss:
            check(f"損失 = {expected_loss} ± 0.02 MW", abs(r["bal"]["Ploss"] - expected_loss) < 0.02,
                  f"loss={r['bal']['Ploss']:.3f} (case={r['caseName']})")

        # ---------- matpower_v2 ----------
        print("\n■ MATPOWER準拠実装 (matpower_v2)")
        page.goto(f"{BASE}/power_flow_matpower_v2.html")
        run_and_wait(page, "() => document.getElementById('balancePanel').innerText.includes('✓')")
        r = page.evaluate("""() => ({
            caseName: document.querySelector('select').value,
            bal: document.getElementById('balancePanel').innerText,
            jacCells: document.querySelectorAll('#jacobianNumeric td').length
        })""")
        check("収支検算 ✓ 表示", "✓" in r["bal"])
        expected = {"case9": "4.641", "case14": "13.393"}.get(r["caseName"])
        if expected:
            check(f"損失 {expected} MW を表示", expected in r["bal"], f"case={r['caseName']}")
        check("実数値ヤコビアンを表示", r["jacCells"] > 0, f"cells={r['jacCells']}")

        # ---------- learn_newton (講演スタイル教材) ----------
        print("\n■ 講演: Newton-Raphson (learn_newton)")
        page.goto(f"{BASE}/learn_newton.html")
        page.wait_for_timeout(600)
        r = page.evaluate("""() => ({
            V: NR.V, dDeg: NR.d * 180 / Math.PI, it: NR.it, conv: NR.conv,
            slides: SLIDES.length,
            j0: (() => { const J = jac(1, 0); return [J.a, J.b, J.c, J.e]; })(),
            gsConv: GS.conv
        })""")
        check("NR収束 (既定負荷 P=0.5)", r["conv"])
        check("V = 0.9771 ± 0.001", abs(r["V"] - 0.9771) < 0.001, f"V={r['V']:.4f}")
        check("δ = -1.525° ± 0.01", abs(r["dDeg"] + 1.525) < 0.01, f"δ={r['dDeg']:.3f}")
        check("フラットスタートJ = [15,5,-5,15]",
              all(abs(a - b) < 0.01 for a, b in zip(r["j0"], [15, 5, -5, 15])), f"J={r['j0']}")
        check("スライド16枚", r["slides"] == 16, f"slides={r['slides']}")
        check("GS参照解も収束", r["gsConv"])

        # ---------- ladder_l0 (学習ラダー) ----------
        print("\n■ ラダーL0 (ladder_l0)")
        page.goto(f"{BASE}/ladder_l0.html")
        page.wait_for_timeout(400)
        r = page.evaluate("""() => ({
            f100: solveFlow(100), f50: solveFlow(50), fOver: solveFlow(505)
        })""")
        check("損失の厳密解 (d=100 → f=105.57)", abs(r["f100"] - 105.573) < 0.01, f"f={r['f100']}")
        check("2倍→約4.2倍の損失", abs((r["f100"] - 100) / (r["f50"] - 50) - 4.23) < 0.1)
        check("限界超え (d=505) で解なし", r["fOver"] is None)

        # ---------- ladder_l1 ----------
        print("\n■ ラダーL1 (ladder_l1)")
        page.goto(f"{BASE}/ladder_l1.html")
        page.wait_for_timeout(400)
        r = page.evaluate("""() => ({
            i275: amps(100, 275), loss275: lossMW(100, 275), loss66: lossMW(100, 66), loss66x10: lossMW(100, 660)
        })""")
        check("I = P/V (100MW/275kV → 363.6A)", abs(r["i275"] - 363.64) < 0.1, f"I={r['i275']}")
        check("損失 I²R (275kV → 1.32MW)", abs(r["loss275"] - 1.322) < 0.01, f"loss={r['loss275']}")
        check("電圧10倍 → 損失1/100", abs(r["loss66"] / r["loss66x10"] - 100) < 0.5)

        # ---------- ladder_l2 ----------
        print("\n■ ラダーL2 (ladder_l2)")
        page.goto(f"{BASE}/ladder_l2.html")
        page.wait_for_timeout(400)
        r = page.evaluate("""() => ({
            p30: pOfDelta(30 * Math.PI / 180), p90: pOfDelta(Math.PI / 2),
            cos60: Math.cos(60 * Math.PI / 180)
        })""")
        check("P(δ=30°) = 1.0 p.u. (V1V2/X=2, sin30°=0.5)", abs(r["p30"] - 1.0) < 1e-9, f"P={r['p30']}")
        check("P(δ=90°) = 2.0 p.u. (頂上)", abs(r["p90"] - 2.0) < 1e-9)

        # ---------- ladder_l5 ----------
        print("\n■ ラダーL5 (ladder_l5)")
        page.goto(f"{BASE}/ladder_l5.html")
        page.wait_for_timeout(600)
        r = page.evaluate("""() => ({
            nose04: CURVES['0.4'].nose.PL, noseV04: CURVES['0.4'].nose.V,
            noseComp: CURVES['-0.2'].nose.PL, noseVComp: CURVES['-0.2'].nose.V,
            detAtNose: Math.abs(CURVES['0.4'].nose.det)
        })""")
        check("ノーズ(tanφ=0.4) ≈ 446 MW", abs(r["nose04"] - 446) < 5, f"nose={r['nose04']:.1f}")
        check("補償でノーズが伸びる (→ ≈690 MW)", abs(r["noseComp"] - 690) < 6, f"nose={r['noseComp']:.1f}")
        check("補償でノーズ電圧が上がる (0.55→0.67)", r["noseVComp"] > r["noseV04"] + 0.08)
        check("ノーズで |det J| ≈ 0", r["detAtNose"] < 1.0, f"|det|={r['detAtNose']:.2f}")

        # ---------- ladder_l6 ----------
        print("\n■ ラダーL6 (ladder_l6)")
        page.goto(f"{BASE}/ladder_l6.html")
        page.wait_for_timeout(600)
        r = page.evaluate("""() => {
            const a = sigAt(1.0), b = sigAt(4.45);
            const low = nrFrom(0.2, -0.5, 4.3, 1.72, 40);
            return { sig1: a.sig, it1: a.it, V1: a.V,
                     sig445: b.sig, it445: b.it, lowV: low ? low.V : null };
        }""")
        check("σ_min(J) at 100MW ≈ 13.77", abs(r["sig1"] - 13.767) < 0.05, f"σ={r['sig1']:.3f}")
        check("σ_min(J) at 445MW ≈ 0.63 (崩落)", abs(r["sig445"] - 0.629) < 0.05, f"σ={r['sig445']:.3f}")
        check("NR反復 100MW: 4回", r["it1"] == 4, f"it={r['it1']}")
        check("NR反復 445MW: 増加 (7〜9回)", 7 <= r["it445"] <= 9, f"it={r['it445']}")
        check("上枝 V(100MW) ≈ 0.9523", abs(r["V1"] - 0.9523) < 0.001, f"V={r['V1']:.4f}")
        check("下枝 V(430MW) ≈ 0.4548 (basin分類の基準)", r["lowV"] is not None and abs(r["lowV"] - 0.4548) < 0.01,
              f"V={r['lowV']}")

        # ---------- dc_accuracy ----------
        print("\n■ DC潮流精度検証 (dc_accuracy)")
        page.goto(f"{BASE}/dc_accuracy_analysis.html")
        run_and_wait(page, "() => /Angle error/.test(document.body.innerText)")
        r = page.evaluate("""() => {
            const m = document.body.innerText.match(/Angle error: avg ([\\d.]+)deg, max ([\\d.]+)deg/);
            return m ? { avg: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
        }""")
        check("角度誤差を出力", r is not None)
        if r:
            check("平均角度誤差 < 1.0°", r["avg"] < 1.0, f"avg={r['avg']}")

        browser.close()

    print(f"\n{'=' * 46}\n数値回帰テスト: {passed} passed, {failed} failed\n{'=' * 46}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
