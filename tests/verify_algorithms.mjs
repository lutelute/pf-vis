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

// Expected IEEE 14-bus solution values (from MATPOWER)
const EXPECTED = {
    voltages: {
        1: 1.0600, 2: 1.0450, 3: 1.0100, 4: 1.0177, 5: 1.0195,
        6: 1.0700, 7: 1.0615, 8: 1.0900, 9: 1.0559, 10: 1.0510,
        11: 1.0569, 12: 1.0552, 13: 1.0503, 14: 1.0355
    },
    tolerance: 0.015  // 1.5% tolerance
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
} catch (e) {
    test('NR execution', false, e.message);
}

// Test 3: Gauss-Seidel
console.log('\n🔄 Gauss-Seidel Method');
try {
    const engine = new PowerFlowEngine(IEEE_14_BUS);
    const result = engine.solveGaussSeidel({ tolerance: 1e-6, maxIterations: 100 });

    test('GS converges', result.converged);
    test('GS iterations < 100', result.iterations < 100, `Got ${result.iterations} iterations`);

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

// Test 6: Algorithm comparison
console.log('\n📊 Algorithm Comparison');
try {
    const nrEngine = new PowerFlowEngine(IEEE_14_BUS);
    const nrResult = nrEngine.solveNewtonRaphson({ tolerance: 1e-8 });

    const gsEngine = new PowerFlowEngine(IEEE_14_BUS);
    const gsResult = gsEngine.solveGaussSeidel({ tolerance: 1e-6, maxIterations: 100 });

    if (nrResult.converged && gsResult.converged) {
        // Compare GS to NR solution
        let maxDiff = 0;
        for (let i = 0; i < nrResult.busResults.length; i++) {
            const diff = Math.abs(nrResult.busResults[i].V - gsResult.busResults[i].V);
            if (diff > maxDiff) maxDiff = diff;
        }
        test('GS matches NR solution', maxDiff < 0.01, `Max difference: ${maxDiff.toFixed(4)} p.u.`);
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
