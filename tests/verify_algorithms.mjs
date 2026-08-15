#!/usr/bin/env node

/**
 * IEEE 14-Bus Algorithm Verification Script
 *
 * @fileoverview Command-line verification script for power flow algorithms.
 * Tests Newton-Raphson, Gauss-Seidel, Fast Decoupled, and DC Power Flow
 * methods against the IEEE 14-bus test case.
 *
 * Usage: node tests/verify_algorithms.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the module files and evaluate them
const ieeeCasesCode = readFileSync(join(__dirname, '../scripts/ieee_cases.js'), 'utf8');
const powerFlowEngineCode = readFileSync(join(__dirname, '../scripts/power_flow_engine.js'), 'utf8');

// Create a mock window object for browser-style globals
globalThis.window = {};

// Evaluate the modules (they will set properties on window)
eval(ieeeCasesCode.replace(/export \{[^}]+\};?/g, ''));
eval(powerFlowEngineCode.replace(/export \{[^}]+\};?/g, ''));

// Get the exported classes/objects from window
const { IEEE_14_BUS, PowerFlowEngine } = window;

// Expected IEEE 14-bus solution values (from MATPOWER runpf(case14))
const EXPECTED = {
    voltages: {
        1: 1.0600, 2: 1.0450, 3: 1.0100, 4: 1.0177, 5: 1.0195,
        6: 1.0700, 7: 1.0615, 8: 1.0900, 9: 1.0559, 10: 1.0510,
        11: 1.0569, 12: 1.0552, 13: 1.0503, 14: 1.0355
    },
    totalLossMW: 13.393,   // MATPOWER: 13.393 MW
    tolerance: 0.001       // 0.1% — reference values are published to 4 decimals
};

// Expected WSCC 9-bus solution values (MATPOWER case9 labelling)
const EXPECTED_9BUS = {
    voltages: {
        1: 1.0400, 2: 1.0250, 3: 1.0250, 4: 1.0258, 5: 1.0127,
        6: 1.0324, 7: 1.0159, 8: 1.0258, 9: 0.9956
    },
    totalLossMW: 4.641,
    tolerance: 0.001
};

let passed = 0;
let failed = 0;

/**
 * Print test result
 */
function test(name, condition, details = '') {
    if (condition) {
        console.log(`  ✅ ${name}`);
        passed++;
    } else {
        console.log(`  ❌ ${name}`);
        if (details) console.log(`     ${details}`);
        failed++;
    }
}

/**
 * Verify voltage accuracy
 */
function verifyVoltages(busResults) {
    let maxError = 0;
    for (const bus of busResults) {
        const expected = EXPECTED.voltages[bus.bus];
        if (expected !== undefined) {
            const error = Math.abs(bus.V - expected);
            if (error > maxError) maxError = error;
        }
    }
    return { maxError, passed: maxError <= EXPECTED.tolerance };
}

console.log('\n========================================');
console.log('IEEE 14-Bus Algorithm Verification');
console.log('========================================\n');

// Test 1: Data validation
console.log('📋 Data Validation');
test('IEEE_14_BUS data loaded', !!IEEE_14_BUS);
test('PowerFlowEngine class available', !!PowerFlowEngine);
test('14 buses in test case', IEEE_14_BUS?.bus?.length === 14);
test('5 generators in test case', IEEE_14_BUS?.gen?.length === 5);
test('20 branches in test case', IEEE_14_BUS?.branch?.length === 20);

// Test 2: Newton-Raphson
console.log('\n⚡ Newton-Raphson Method');
try {
    const engine = new PowerFlowEngine(IEEE_14_BUS);
    const result = engine.solveNewtonRaphson({ tolerance: 1e-6, maxIterations: 50 });

    test('NR converges', result.converged);
    test('NR iterations < 10', result.iterations < 10, `Got ${result.iterations} iterations`);

    const voltageCheck = verifyVoltages(result.busResults);
    test('NR voltage accuracy', voltageCheck.passed, `Max error: ${voltageCheck.maxError.toFixed(4)} p.u.`);

    // Verify slack bus voltage
    const slackBus = result.busResults.find(b => b.bus === 1);
    test('NR slack voltage = 1.06', Math.abs(slackBus.V - 1.06) < 0.001);

    // Verify total system losses against MATPOWER
    const totalLoss = engine.getBranchFlows().reduce((s, f) => s + f.Ploss, 0);
    test('NR total loss = 13.393 MW', Math.abs(totalLoss - EXPECTED.totalLossMW) < 0.01,
        `Got ${totalLoss.toFixed(3)} MW`);
} catch (e) {
    test('NR execution', false, e.message);
}

// Test 2b: WSCC 9-bus verification
console.log('\n⚡ WSCC 9-Bus (Newton-Raphson)');
try {
    const engine9 = new PowerFlowEngine(window.IEEE_9_BUS);
    const result9 = engine9.solveNewtonRaphson({ tolerance: 1e-8, maxIterations: 50 });

    test('9-bus NR converges', result9.converged);

    let maxErr9 = 0;
    for (const bus of result9.busResults) {
        const exp = EXPECTED_9BUS.voltages[bus.bus];
        if (exp !== undefined) maxErr9 = Math.max(maxErr9, Math.abs(bus.V - exp));
    }
    test('9-bus voltage accuracy', maxErr9 <= EXPECTED_9BUS.tolerance,
        `Max error: ${maxErr9.toFixed(4)} p.u.`);

    const loss9 = engine9.getBranchFlows().reduce((s, f) => s + f.Ploss, 0);
    test('9-bus total loss = 4.641 MW', Math.abs(loss9 - EXPECTED_9BUS.totalLossMW) < 0.01,
        `Got ${loss9.toFixed(3)} MW`);
} catch (e) {
    test('9-bus execution', false, e.message);
}

// Test 3: Gauss-Seidel
console.log('\n🔄 Gauss-Seidel Method');
try {
    // Gauss-Seidel converges linearly: IEEE 14-bus needs ~170 iterations
    // at tol=1e-6 (vs ~4 for Newton-Raphson) — a key teaching contrast
    const engine = new PowerFlowEngine(IEEE_14_BUS);
    const result = engine.solveGaussSeidel({ tolerance: 1e-6, maxIterations: 500 });

    test('GS converges', result.converged);
    test('GS iterations < 300', result.iterations < 300, `Got ${result.iterations} iterations`);

    if (result.converged) {
        const voltageCheck = verifyVoltages(result.busResults);
        test('GS voltage accuracy', voltageCheck.passed, `Max error: ${voltageCheck.maxError.toFixed(4)} p.u.`);
    }
} catch (e) {
    test('GS execution', false, e.message);
}

// Test 4: Fast Decoupled XB
console.log('\n⚙️ Fast Decoupled XB Method');
try {
    const engine = new PowerFlowEngine(IEEE_14_BUS);
    const result = engine.solveFastDecoupled({ tolerance: 1e-6, maxIterations: 50 });

    test('FDXB converges', result.converged);

    if (result.converged) {
        const voltageCheck = verifyVoltages(result.busResults);
        test('FDXB voltage accuracy', voltageCheck.passed, `Max error: ${voltageCheck.maxError.toFixed(4)} p.u.`);
    }
} catch (e) {
    test('FDXB execution', false, e.message);
}

// Test 5: DC Power Flow
console.log('\n📐 DC Power Flow');
try {
    const engine = new PowerFlowEngine(IEEE_14_BUS);
    const result = engine.solveDC();

    test('DC solution obtained', result.converged);

    // DC assumes all voltages are 1.0
    const allUnity = result.busResults.every(b => Math.abs(b.V - 1.0) < 0.001);
    test('DC voltages = 1.0 (assumption)', allUnity);

    // Angles should be within reasonable range
    const anglesOk = result.busResults.every(b => b.delta >= -20 && b.delta <= 5);
    test('DC angles in reasonable range', anglesOk);
} catch (e) {
    test('DC execution', false, e.message);
}

// Test 6: Algorithm cross-agreement (異なる手法が同一解に到達することの相互検証)
console.log('\n📊 Algorithm Cross-Agreement');
try {
    const maxVDiff = (a, b) => {
        let d = 0;
        for (let i = 0; i < a.busResults.length; i++) {
            d = Math.max(d, Math.abs(a.busResults[i].V - b.busResults[i].V));
        }
        return d;
    };

    const nrEngine = new PowerFlowEngine(IEEE_14_BUS);
    const nrResult = nrEngine.solveNewtonRaphson({ tolerance: 1e-8 });

    const gsEngine = new PowerFlowEngine(IEEE_14_BUS);
    const gsResult = gsEngine.solveGaussSeidel({ tolerance: 1e-6, maxIterations: 500 });

    const fdEngine = new PowerFlowEngine(IEEE_14_BUS);
    const fdResult = fdEngine.solveFastDecoupled({ tolerance: 1e-6, maxIterations: 100 });

    if (nrResult.converged && gsResult.converged) {
        const d = maxVDiff(nrResult, gsResult);
        test('GS matches NR solution (case14)', d < 0.001, `Max diff: ${d.toExponential(2)} p.u.`);
    }
    if (nrResult.converged && fdResult.converged) {
        const d = maxVDiff(nrResult, fdResult);
        test('FDXB matches NR solution (case14)', d < 0.001, `Max diff: ${d.toExponential(2)} p.u.`);
    }

    // WSCC 9-bus でも相互一致を確認
    const nr9 = new PowerFlowEngine(window.IEEE_9_BUS);
    const nr9r = nr9.solveNewtonRaphson({ tolerance: 1e-8 });
    const fd9 = new PowerFlowEngine(window.IEEE_9_BUS);
    const fd9r = fd9.solveFastDecoupled({ tolerance: 1e-6, maxIterations: 100 });
    if (nr9r.converged && fd9r.converged) {
        const d = maxVDiff(nr9r, fd9r);
        test('FDXB matches NR solution (case9)', d < 0.001, `Max diff: ${d.toExponential(2)} p.u.`);
    }
} catch (e) {
    test('Comparison', false, e.message);
}

// Test 7: solveWithTrace（シミュレータ用API）が solve と完全等価であること
console.log('\n🎞 solveWithTrace (トレースAPIの等価性)');
try {
    const eq = (a, b) => Math.max(...a.busResults.map((x, i) => Math.abs(x.V - b.busResults[i].V)));

    const nrA = new PowerFlowEngine(IEEE_14_BUS).solveNewtonRaphson({ tolerance: 1e-6, maxIterations: 50 });
    const nrB = new PowerFlowEngine(IEEE_14_BUS).solveWithTrace({ algorithm: 'nr', tolerance: 1e-6, maxIterations: 50 });
    test('NR: trace版の反復回数が solve と一致', nrA.iterations === nrB.iterations,
        `${nrA.iterations} vs ${nrB.iterations}`);
    test('NR: trace版の解が solve と一致', eq(nrA, nrB) < 1e-12);
    test('NR: コマ数 = 反復+1', nrB.trace.length === nrB.iterations + 1, `${nrB.trace.length}`);

    const gsA = new PowerFlowEngine(window.IEEE_9_BUS).solveGaussSeidel({ tolerance: 1e-6, maxIterations: 500 });
    const gsB = new PowerFlowEngine(window.IEEE_9_BUS).solveWithTrace({ algorithm: 'gs', tolerance: 1e-6, maxIterations: 500, subSteps: true });
    test('GS: subSteps版の反復回数が solve と一致', gsA.iterations === gsB.iterations,
        `${gsA.iterations} vs ${gsB.iterations}`);
    test('GS: subSteps版の解が solve と一致', eq(gsA, gsB) < 1e-12);
    test('GS: サブコマ数 = 反復×(母線-1)+1', gsB.trace.length === gsB.iterations * 8 + 1, `${gsB.trace.length}`);

    const fdA = new PowerFlowEngine(IEEE_14_BUS).solveFastDecoupled({ tolerance: 1e-6, maxIterations: 100 });
    const fdB = new PowerFlowEngine(IEEE_14_BUS).solveWithTrace({ algorithm: 'fdxb', tolerance: 1e-6, maxIterations: 100, subSteps: true });
    test('FDXB: subSteps版の反復回数が solve と一致', fdA.iterations === fdB.iterations,
        `${fdA.iterations} vs ${fdB.iterations}`);
    test('FDXB: 半反復コマ(P/Q)が記録される',
        fdB.trace.some(f => f.phase === 'P') && fdB.trace.some(f => f.phase === 'Q'));

    const dcB = new PowerFlowEngine(IEEE_14_BUS).solveWithTrace({ algorithm: 'dc' });
    test('DC: 2コマ（初期値→直接求解）で |V|=1', dcB.trace.length === 2 &&
        dcB.trace[1].V.every(v => Math.abs(v - 1) < 1e-9));
} catch (e) {
    test('solveWithTrace 実行', false, e.message);
}

// Test 8: モデルの正確化（位相シフト・STATUS・r=0の厳密扱い）
console.log('\n🔩 モデルの正確化');
try {
    // (a) 位相シフト: 2母線でシフトφを入れると |V2| は不変・δ2 はちょうど −φ ずれる
    //     （枝方程式で Vt→Vt·e^{jφ} と置換すると無シフト問題に帰着する厳密な性質）
    const mkShift = (phi) => {
        const cd = JSON.parse(JSON.stringify(window.IEEE_2_BUS));
        cd.branch[0][9] = phi;
        const e = new PowerFlowEngine(cd);
        e.solveNewtonRaphson({ tolerance: 1e-12, maxIterations: 40 });
        return e;
    };
    const s0 = mkShift(0), s5 = mkShift(5);
    test('シフト5°: |V2| は不変', Math.abs(s0.V[1] - s5.V[1]) < 1e-9,
        `${s0.V[1].toFixed(9)} vs ${s5.V[1].toFixed(9)}`);
    const dDeg = (s5.delta[1] - s0.delta[1]) * 180 / Math.PI;
    test('シフト5°: δ2 はちょうど −5° ずれる', Math.abs(dDeg + 5) < 1e-7, `Δδ=${dDeg.toFixed(7)}°`);

    // (b) 枝STATUS: 停止枝は Ybus から消え、N-1 状態が解ける
    const cdN1 = JSON.parse(JSON.stringify(IEEE_14_BUS));
    cdN1.branch[17][10] = 0; // 枝 10-11 停止
    const eN1 = new PowerFlowEngine(cdN1);
    test('停止枝は Ybus に入らない', eN1.Ybus.re[9][10] === 0 && eN1.Ybus.im[9][10] === 0);
    const rN1 = eN1.solveNewtonRaphson({ tolerance: 1e-8, maxIterations: 40 });
    const lossN1 = eN1.getBranchFlows().reduce((s, f) => s + f.Ploss, 0);
    test('N-1 (枝10-11停止) が解ける', rN1.converged, `${rN1.iterations} 回`);
    test('N-1 で損失が基準と変わる', Math.abs(lossN1 - 13.393) > 0.001, `${lossN1.toFixed(3)} MW`);
    test('N-1 でも電力収支が成立', Math.abs(eN1.getPowerBalance().residualMW) < 1e-6);

    // (c) 発電機STATUS: 停止発電機は注入されず、その母線は PQ として解かれる
    const cdG = JSON.parse(JSON.stringify(IEEE_14_BUS));
    cdG.gen[1][7] = 0; // bus2 の発電機停止
    const eG = new PowerFlowEngine(cdG);
    const rG = eG.solveNewtonRaphson({ tolerance: 1e-8, maxIterations: 40 });
    test('発電機停止でも収束', rG.converged);
    test('停止発電機の母線は電圧設定値を維持しない（PQ降格）',
        Math.abs(eG.V[1] - 1.045) > 1e-3, `V2=${eG.V[1].toFixed(4)}`);
    test('停止発電機の出力はゼロ', rG.busResults[1].Pgen === 0 && rG.busResults[1].Qgen === 0);
    test('発電機停止でも電力収支が成立', Math.abs(eG.getPowerBalance().residualMW) < 1e-6);
} catch (e) {
    test('モデル正確化テスト実行', false, e.message);
}

// Test 9: 解析API（電力収支・ミスマッチ・実測次数・ヤコビアン照合）
console.log('\n🧮 解析API');
try {
    const e14 = new PowerFlowEngine(IEEE_14_BUS);
    e14.solveNewtonRaphson({ tolerance: 1e-10, maxIterations: 40 });
    const bal = e14.getPowerBalance();
    test('収支: 発電 272.39 MW（スラックは解かれた値）', Math.abs(bal.genMW - 272.39) < 0.05,
        `${bal.genMW.toFixed(2)} MW`);
    test('収支: 発電 = 負荷 + 損失（残差 < 1e-6 MW）', Math.abs(bal.residualMW) < 1e-6,
        `${bal.genMW.toFixed(3)} = ${bal.loadMW.toFixed(3)} + ${bal.lossMW.toFixed(3)} (res ${bal.residualMW.toExponential(1)})`);

    const mis = e14.getMismatchSnapshot();
    test('ミスマッチ: 収束後は全母線 < 1e-9', mis.maxError < 1e-9, mis.maxError.toExponential(1));
    test('ミスマッチ: スラックにP行なし・PV母線にQ行なし',
        !mis.perBus[0].hasP && !mis.perBus[1].hasQ && mis.perBus[3].hasQ);

    const pNR = e14.estimateConvergenceOrder();
    test('実測次数: NR p ≈ 2', pNR !== null && pNR > 1.5 && pNR < 2.6, `p=${pNR?.toFixed(2)}`);
    const eGS = new PowerFlowEngine(IEEE_14_BUS);
    eGS.solveGaussSeidel({ tolerance: 1e-6, maxIterations: 500 });
    const pGS = eGS.estimateConvergenceOrder({ skip: 20 });
    test('実測次数: GS p ≈ 1', pGS !== null && pGS > 0.8 && pGS < 1.2, `p=${pGS?.toFixed(2)}`);

    // ヤコビアンの有限差分照合: getJacobianSnapshot の全要素を
    // 「実際に θ/V を微小に動かした再計算」と突き合わせる
    const eJ = new PowerFlowEngine(window.IEEE_9_BUS);
    const snap = eJ.getJacobianSnapshot();
    const nP = snap.pBuses.length, nQ = snap.qBuses.length;
    const eps = 1e-7;
    let maxDiffPlus = 0, maxDiffMinus = 0;
    for (let c = 0; c < nP + nQ; c++) {
        const before = eJ._calcPowerInjection();
        if (c < nP) eJ.delta[snap.pBuses[c]] += eps;
        else eJ.V[snap.qBuses[c - nP]] += eps;
        const after = eJ._calcPowerInjection();
        if (c < nP) eJ.delta[snap.pBuses[c]] -= eps;
        else eJ.V[snap.qBuses[c - nP]] -= eps;
        for (let r = 0; r < nP + nQ; r++) {
            const fd = ((r < nP ? after.P[snap.pBuses[r]] : after.Q[snap.qBuses[r - nP]])
                - (r < nP ? before.P[snap.pBuses[r]] : before.Q[snap.qBuses[r - nP]])) / eps;
            const scale = Math.max(1, Math.abs(snap.J[r][c]));
            maxDiffMinus = Math.max(maxDiffMinus, Math.abs(snap.J[r][c] - fd) / scale);
            maxDiffPlus = Math.max(maxDiffPlus, Math.abs(snap.J[r][c] + fd) / scale);
        }
    }
    const fdOK = Math.min(maxDiffMinus, maxDiffPlus);
    test(`ヤコビアン全${(nP + nQ) * (nP + nQ)}要素が有限差分と一致 (<1e-4)`, fdOK < 1e-4,
        `max相対誤差 ${fdOK.toExponential(1)}（符号規約: ${maxDiffMinus < maxDiffPlus ? 'J=∂(P,Q)/∂(θ,V)' : 'J=−∂(P,Q)/∂(θ,V)'}）`);
} catch (e) {
    test('解析APIテスト実行', false, e.message);
}

// Test 10: Q制約考慮NR と PV曲線トレース
console.log('\n⚡ Q制約・PV曲線');
try {
    // Q制約: bus2 の QMAX をきつく（20 MVAr）して解くと、Qは制約値に張り付き電圧が下がる
    const cdQ = JSON.parse(JSON.stringify(IEEE_14_BUS));
    cdQ.gen[1][3] = 20; // QMAX
    const eQ0 = new PowerFlowEngine(cdQ);
    eQ0.solveNewtonRaphson({ tolerance: 1e-8 });
    test('Q制約なし（既定）: V2 は設定値 1.045 を維持', Math.abs(eQ0.V[1] - 1.045) < 1e-6);

    const eQ = new PowerFlowEngine(cdQ);
    const rQ = eQ.solveNewtonRaphson({ tolerance: 1e-8, enforceQLimits: true });
    test('Q制約あり: 収束', rQ.converged);
    test('Q制約あり: bus2 が QMAX に到達', rQ.qLimitHits.some(h => h.bus === 2 && h.limit === 'max'),
        JSON.stringify(rQ.qLimitHits));
    test('Q制約あり: bus2 の電圧が設定値から低下', eQ.V[1] < 1.045 - 1e-3, `V2=${eQ.V[1].toFixed(4)}`);
    test('Q制約あり: 電力収支が成立', Math.abs(eQ.getPowerBalance().residualMW) < 1e-6);

    // PV曲線: WSCC9 の負荷を増やしていくとノーズ点がある
    const ePV = new PowerFlowEngine(window.IEEE_9_BUS);
    const curve = ePV.tracePVCurve({ lambdaMax: 5, initialStep: 0.1 });
    test('PV曲線: ノーズ点が λ>1.2 に存在', curve.noseLambda !== null && curve.noseLambda > 1.2 && curve.noseLambda < 5,
        `λ_max=${curve.noseLambda?.toFixed(4)}`);
    test('PV曲線: 点数 ≥ 5', curve.points.length >= 5, `${curve.points.length} 点`);
    const monotonic = curve.points.every((p, k) => k === 0 || p.Vmin <= curve.points[k - 1].Vmin + 1e-9);
    test('PV曲線: 上枝で最低電圧が単調低下', monotonic);
    test('PV曲線: 実行後に λ=1 の解へ復元', Math.abs(ePV.getPowerBalance().residualMW) < 1e-6 &&
        Math.abs(ePV.busData[4][2] - 90) < 1e-9);
    console.log(`     [記録] WSCC9 ノーズ点 λ≈${curve.noseLambda?.toFixed(3)}（総負荷 ${(315 * curve.noseLambda).toFixed(0)} MW 相当）`);
} catch (e) {
    test('Q制約・PV曲線テスト実行', false, e.message);
}

// Summary
console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}
