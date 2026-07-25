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

// Summary
console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}
