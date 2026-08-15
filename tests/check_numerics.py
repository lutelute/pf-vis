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

        # ---------- simulator (トレース再生シミュレータ) ----------
        print("\n■ アルゴリズム・シミュレータ (simulator)")
        page.goto(f"{BASE}/power_flow_simulator.html")
        page.wait_for_function("() => window.simState && window.simState.frames > 0")
        r = page.evaluate("""() => window.simState""")
        check("単独モード: NR(WSCC9) 収束", r["converged"])
        check("NR コマ数 = 反復+1 (≦8)", 3 <= r["frames"] <= 8, f"frames={r['frames']}")
        # 最終コマへ → 電力収支の検算が表示されること（発電=負荷+損失）
        page.evaluate("""() => {
            const s = document.getElementById('scrub');
            s.value = s.max; s.dispatchEvent(new Event('input'));
        }""")
        page.wait_for_function("() => window.simState.balanceResidual !== undefined")
        r = page.evaluate("""() => ({ res: window.simState.balanceResidual,
                                       loss: window.simState.lossMW,
                                       txt: document.getElementById('readout').innerText })""")
        check("収支検算を表示（残差 < 1e-3 MW）", abs(r["res"]) < 1e-3, f"res={r['res']:.2e}")
        check("収支の損失 = 4.641 MW (WSCC9)", abs(r["loss"] - 4.641) < 0.01, f"loss={r['loss']:.3f}")
        check("読み出しに収支テキスト", "収支" in r["txt"] and "残差" in r["txt"])
        # PV曲線（エンジン tracePVCurve）: WSCC9 のノーズ点 λ≈2.64
        page.evaluate("() => { document.getElementById('pvBtn').click(); }")
        page.wait_for_function("() => window.simState.noseLambda !== undefined", timeout=30000)
        r = page.evaluate("""() => window.simState.noseLambda""")
        check("PV曲線: ノーズ点 λ≈2.64 (WSCC9)", 2.4 < r < 2.9, f"λ={r:.3f}")
        # GS のサブステップ再生（1母線ずつ）
        page.evaluate("""() => {
            const sel = document.getElementById('methodSel');
            sel.value = 'gs'; sel.dispatchEvent(new Event('change'));
        }""")
        page.wait_for_function("() => window.simState.method === 'gs'")
        r = page.evaluate("""() => window.simState""")
        check("GS(WSCC9): 1母線ずつのコマ (= 反復×8+2±1)",
              abs(r["frames"] - (r["iterations"] * 8 + 2)) <= 1,
              f"frames={r['frames']}, iter={r['iterations']}")
        # 網羅実測表: 損失が MATPOWER 公式値と一致すること
        page.evaluate("() => { document.getElementById('tabMatrix').click(); }")
        page.evaluate("() => { document.getElementById('runMatrixBtn').click(); }")
        page.wait_for_function("() => window.matrixResults && window.matrixResults.losses", timeout=60000)
        r = page.evaluate("""() => ({
            l14: window.matrixResults.losses.case14, l9: window.matrixResults.losses.case9,
            nr14: window.matrixResults['nr:case14'], gs14: window.matrixResults['gs:case14'],
            n30: window.matrixResults['nr:case30']
        })""")
        check("網羅表: IEEE14 損失 13.393 MW (MATPOWER一致)", abs(r["l14"] - 13.393) < 0.01, f"loss={r['l14']:.3f}")
        check("網羅表: WSCC9 損失 4.641 MW (MATPOWER一致)", abs(r["l9"] - 4.641) < 0.01, f"loss={r['l9']:.3f}")
        check("網羅表: NR(case14) ≦6回で収束", r["nr14"]["converged"] and r["nr14"]["iterations"] <= 6,
              f"iter={r['nr14']['iterations']}")
        check("網羅表: GS(case14) 収束 (線形収束の回数)", r["gs14"]["converged"] and r["gs14"]["iterations"] > 50,
              f"iter={r['gs14']['iterations']}")
        check("網羅表: NR(case30) 収束", r["n30"]["converged"], f"iter={r['n30']['iterations']}")

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

        # ---------- learn_gs (GS講演) ----------
        print("\n■ GS講演 (learn_gs)")
        page.goto(f"{BASE}/learn_gs.html")
        page.wait_for_timeout(500)
        r = page.evaluate("""() => ({
            slides: SLIDES.length, gs1: GS1.it, gs16: GS16.conv ? GS16.it : -1,
            nr: NRIT, conv: GS1.conv,
            rate0: RATE_SWEEP[0].rate, rate4: RATE_SWEEP[4].rate
        })""")
        check("スライド14枚", r["slides"] == 14)
        check("GS(ω=1.0): 7回収束 (P=0.5)", r["conv"] and r["gs1"] == 7, f"it={r['gs1']}")
        check("GS(ω=1.6): 51回 (加速が逆効果)", r["gs16"] == 51, f"it={r['gs16']}")
        check("NR: 3回 (対比)", r["nr"] == 3)
        check("収束比率ρ: 負荷で悪化 (0.04→0.65)",
              abs(r["rate0"] - 0.036) < 0.01 and abs(r["rate4"] - 0.653) < 0.02,
              f"ρ={r['rate0']:.3f}→{r['rate4']:.3f}")

        # ---------- learn_dc (DC講演) ----------
        print("\n■ DC講演 (learn_dc)")
        page.goto(f"{BASE}/learn_dc.html")
        page.wait_for_timeout(500)
        r = page.evaluate("""() => {
            const s = SWEEP.find(x => Math.abs(x.P - 0.5) < 0.05);
            const h = SWEEP[SWEEP.length - 1];
            const R = 180 / Math.PI;
            return { slides: SLIDES.length, n: SWEEP.length,
                     dAC: s.dAC * R, dDC: s.dDC * R,
                     diffH: Math.abs(h.dAC - h.dDC) * R, vH: h.V };
        }""")
        check("スライド13枚", r["slides"] == 13)
        check("AC解 δ=-1.525° (P=0.5, 既存検証値と一致)", abs(r["dAC"] + 1.525) < 0.01, f"δ={r['dAC']:.3f}")
        check("DC解 δ=-1.719° (=-P·x)", abs(r["dDC"] + 1.719) < 0.01, f"δ={r['dDC']:.3f}")
        check("重負荷で誤差拡大 (P≈4.2で>3°)", r["diffH"] > 3.0, f"diff={r['diffH']:.2f}°")
        check("重負荷でV低下 (DCは見えない)", r["vH"] < 0.75, f"V={r['vH']:.3f}")

        # ---------- learn_collapse (崩壊講演) ----------
        print("\n■ 崩壊講演 (learn_collapse)")
        page.goto(f"{BASE}/learn_collapse.html")
        page.wait_for_timeout(500)
        r = page.evaluate("""() => {
            const flat = nrFrom(1, 0, 4.3, 1.72), deep = nrFrom(0.3, -0.8, 4.3, 1.72);
            return { slides: SLIDES.length,
                     nose: CURVE.nose.PL, noseC: CURVE_C.nose.PL,
                     noseV: CURVE.nose.V, noseVC: CURVE_C.nose.V,
                     upV: flat.conv ? flat.V : null, loV: deep.conv ? deep.V : null };
        }""")
        check("スライド13枚", r["slides"] == 13)
        check("ノーズ ≈ 446 MW (L5と一致)", abs(r["nose"] - 446) < 5, f"nose={r['nose']:.1f}")
        check("補償ノーズ ≈ 690 MW", abs(r["noseC"] - 690) < 6, f"nose={r['noseC']:.1f}")
        check("補償でノーズ電圧上昇 (0.55→0.67)", r["noseVC"] > r["noseV"] + 0.08)
        check("初期値A/B: フラット→上枝0.644 / 深い→下枝0.455",
              r["upV"] is not None and abs(r["upV"] - 0.644) < 0.01
              and r["loV"] is not None and abs(r["loV"] - 0.455) < 0.01,
              f"up={r['upV']}, lo={r['loV']}")

        # ---------- map (学習アトラス) ----------
        print("\n■ 学習アトラス (map)")
        page.goto(f"{BASE}/map.html")
        page.wait_for_timeout(400)
        r = page.evaluate("""() => ({
            cards: M.length,
            hrefs: M.map(m => m.h),
            spineOk: SPINE.every(n => M.some(m => m.n === n)),
            motOk: M.every(m => typeof MOT[m.mo] === 'function')
        })""")
        check("カード19枚 (16教材+講演3)", r["cards"] == 19, f"cards={r['cards']}")
        check("推奨順路の全項目がカードに存在", r["spineOk"])
        check("全カードにミニ可視化が定義", r["motOk"])
        import os as _os
        missing = [h for h in r["hrefs"] if not _os.path.exists(_os.path.join(_os.path.dirname(__file__), "..", h))]
        check("全リンク先ページが実在", not missing, f"missing={missing}")
        # 進捗連携: 昇級記録がカードバッジに反映される
        page.evaluate("() => localStorage.setItem('pfvis_ladder_l1', JSON.stringify({q1:true,q2:true,q3:true}))")
        page.reload()
        page.wait_for_timeout(400)
        r = page.evaluate("() => progressOf(M.find(m => m.n === 'L1 高圧送電'))")
        check("昇級記録がマップの✓に反映", r == "✓", f"badge={r}")
        page.evaluate("() => localStorage.removeItem('pfvis_ladder_l1')")

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

        # 昇級課題の進捗永続化: 保存→リロード→復元
        page.evaluate("() => localStorage.setItem('pfvis_ladder_l0',"
                      " JSON.stringify({q1:true,q2:true,q3:true}))")
        page.reload()
        page.wait_for_timeout(400)
        r = page.evaluate("""() => ({
            mark: document.getElementById('q1m').textContent,
            unlocked: document.getElementById('nextbox').textContent.includes('修了')
        })""")
        check("進捗復元: 合格マーク再現", "✅" in r["mark"])
        check("進捗復元: 修了ボックス解放", r["unlocked"])
        page.evaluate("() => localStorage.removeItem('pfvis_ladder_l0')")

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

        # ---------- ladder_bridge (L2⇔L3橋渡し) ----------
        print("\n■ ラダー橋渡し (ladder_bridge)")
        page.goto(f"{BASE}/ladder_bridge.html")
        page.wait_for_timeout(400)
        r = page.evaluate("""() => {
            const s = sOfVI(0.8, -30), chk = pAvg(0.8, -30), y = ybusY();
            return { P: s.P, Q: s.Q, chk, zb275: zbase(275), zpu66: 10 / zbase(6.6),
                     g: y.g, b: y.b };
        }""")
        check("S=VI*: P = 0.6928 (|I|=0.8, θi=-30°)", abs(r["P"] - 0.6928) < 1e-3, f"P={r['P']:.4f}")
        check("S=VI*: Q = +0.4 (遅れ電流=誘導性)", abs(r["Q"] - 0.4) < 1e-3, f"Q={r['Q']:.4f}")
        check("検算: p(t)数値積分の平均 = P", abs(r["chk"] - r["P"]) < 1e-3, f"avg={r['chk']:.4f}")
        check("p.u.: Zbase(275kV) = 756.25Ω", abs(r["zb275"] - 756.25) < 0.01)
        check("p.u.: 6.6kVで10Ω → 22.96pu (L1の破綻の別表現)", abs(r["zpu66"] - 22.957) < 0.01, f"zpu={r['zpu66']:.3f}")
        check("Ybus: y = 5 - j15 (共通2母線系統と一致)", abs(r["g"] - 5) < 1e-9 and abs(r["b"] + 15) < 1e-9)

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
