# Algorithm Inventory

This document provides a comprehensive inventory of all power flow algorithm implementations in the codebase, including their locations, current naming patterns, and usage.

## Overview

The Power Flow Visualization project contains multiple implementations of power flow algorithms across various HTML files. Each implementation serves a different educational or visualization purpose.

---

## Algorithm Summary

| Algorithm | Method Type | Use Case | Convergence |
|-----------|-------------|----------|-------------|
| Newton-Raphson | Iterative | General purpose, most common | Quadratic |
| Fast Decoupled (XB/BX) | Iterative | Large systems, weak P-Q coupling | Faster per iteration |
| Gauss-Seidel | Iterative | Educational, simple systems | Linear |
| DC Power Flow | Direct | Quick estimates, non-iterative | N/A |

---

## Algorithm Implementations by File

### 1. `power_flow_matpower_v2.html`

**Purpose**: MATPOWER-compatible power flow solver with multiple algorithms

**Class**: `PowerFlowEngine`

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `constructor(caseData)` | 909 | Initialize engine with case data | Class constructor |
| `initialize()` | 939 | Set up bus types and generator data | camelCase |
| `buildYbus()` | 974 | Build admittance matrix | camelCase |
| `calcPowerInjection()` | 1018 | Calculate P, Q injections | camelCase |
| `calcMismatch()` | 1036 | Calculate power mismatches | camelCase |
| `newtonRaphsonStep()` | 1059 | Single Newton-Raphson iteration | camelCase |
| `buildJacobian(deltaP, deltaQ)` | 1093 | Build Jacobian matrix | camelCase |
| `fastDecoupledStep()` | 1266 | Single Fast Decoupled iteration | camelCase |

**Sample Data**: `MATPOWER_CASES` (line 694)
- `case5` - 5-bus test system
- `case9` - 9-bus test system
- `case14` - IEEE 14-bus standard test
- `case30` - IEEE 30-bus standard test

---

### 2. `power_flow_v5.html`

**Purpose**: Comprehensive MATPOWER-compatible suite with multiple algorithms

**Class**: `PowerFlowEngine`

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `constructor(caseData)` | 818 | Initialize engine with case data | Class constructor |
| `reset()` | 828 | Reset solver state | camelCase |
| `initialize()` | 845 | Set up bus types and generator data | camelCase |
| `buildYbus()` | 877 | Build admittance matrix | camelCase |
| `calcPower()` | 926 | Calculate P, Q at buses | camelCase |
| `calcMismatch()` | 942 | Calculate power mismatches | camelCase |
| `nrStep()` | 963 | Single Newton-Raphson iteration | **abbreviated** |
| `gsStep()` | - | Single Gauss-Seidel iteration | **abbreviated** |
| `dcStep()` | 1226 | DC power flow calculation | **abbreviated** |
| `buildAlgoButtons()` | 1494 | UI helper for algorithm buttons | camelCase |

**Sample Data**: `CASES` object (line 512)
- `generateRandomCase(nBus, meshRatio)` - Random case generator
- `random30`, `random50`, `random100` - Pre-generated random cases

---

### 3. `power_flow_compare.html`

**Purpose**: Algorithm comparison and benchmarking tool

**Class**: `PowerFlowEngine`

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `fastDecoupledXBStep()` | 1248 | Fast Decoupled XB variant | camelCase |
| `fastDecoupledBXStep()` | 1285 | Fast Decoupled BX variant | camelCase |
| `buildAlgoCheckboxes()` | 1695 | UI helper for checkboxes | camelCase |
| `buildAlgoInfoGrid()` | 1727 | UI helper for info grid | camelCase |

**Sample Data**: `MATPOWER_CASES` (line 889)

---

### 4. `dc_accuracy_analysis.html`

**Purpose**: DC power flow accuracy validation and comparison

**Class**: `PowerFlowEngine`

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `constructor(caseData)` | 502 | Initialize engine | Class constructor |

**Sample Data**: `CASES` (line 342)

---

### 5. `power_flow_intuitive_v6_fixed.html` (Recommended Reference)

**Purpose**: Step-by-step algorithm visualization with convergence display

**Architecture**: Standalone functions (not class-based)

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `calcPQ(prob, busIdx, V, delta)` | 857 | Calculate power at bus | camelCase |
| `calcMismatch(prob, busIdx, V, delta)` | 880 | Calculate power mismatch | camelCase |
| `calcError(prob, busIdx, V, delta)` | 900 | Calculate max error | camelCase |
| `calcJacobian(prob, busIdx, V, delta)` | 906 | Build 2x2 Jacobian | camelCase |
| `newtonStep()` | 1013 | Newton-Raphson iteration | camelCase |
| `gaussSeidelStep()` | 1054 | Gauss-Seidel iteration | camelCase |
| `dcStep()` | 1183 | DC power flow step | camelCase |

---

### 6. `power_flow_intuitive_v7.html`

**Purpose**: Latest intuitive visualizer iteration

**Architecture**: Standalone functions

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `calcPQ(prob, busIdx, V, delta)` | 687 | Calculate power at bus | camelCase |
| `calcMismatch(prob, busIdx, V, delta)` | 710 | Calculate power mismatch | camelCase |
| `calcError(prob, busIdx, V, delta)` | 720 | Calculate max error | camelCase |
| `calcJacobian(prob, busIdx, V, delta)` | 726 | Build Jacobian | camelCase |
| `newtonStep()` | 780 | Newton-Raphson iteration | camelCase |
| `gaussSeidelStep()` | 805 | Gauss-Seidel iteration | camelCase |
| `dcStep()` | 925 | DC power flow step | camelCase |

---

### 7. `power_flow_intuitive_v5.html`, `power_flow_intuitive_v6.html`, `power_flow_intuitive_v4.html`

**Purpose**: Earlier versions of intuitive visualizer

**Architecture**: Standalone functions (same pattern as v6_fixed)

| Function | Pattern | Notes |
|----------|---------|-------|
| `calcPQ()` | camelCase | Same as v6_fixed |
| `calcMismatch()` | camelCase | Same as v6_fixed |
| `calcError()` | camelCase | Same as v6_fixed |
| `calcJacobian()` | camelCase | Same as v6_fixed |
| `newtonStep()` | camelCase | Same as v6_fixed |
| `gaussSeidelStep()` | camelCase | Same as v6_fixed |
| `dcStep()` | camelCase | Same as v6_fixed |

---

### 8. `power_flow_intuitive.html`, `power_flow_intuitive_v3.html`

**Purpose**: Original and v3 intuitive visualizers

**Architecture**: Standalone functions

| Function | Line (v3) | Description | Naming Pattern |
|----------|-----------|-------------|----------------|
| `calculateMismatch(V, delta)` | 830 | Calculate mismatch | **calculate** prefix |
| `calculateJacobian(V, delta)` | 886 | Build Jacobian | **calculate** prefix |
| `newtonStep()` | 938 | Newton-Raphson iteration | camelCase |
| `gaussSeidelStep()` | 1038 | Gauss-Seidel iteration | camelCase |

---

### 9. `power_flow_process_visualizer_v2.html`

**Purpose**: Step-by-step process visualization

**Architecture**: Standalone functions

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `buildYbus()` | 1024 | Build admittance matrix | camelCase |
| `calculateBusMismatch(bus)` | 1253 | Calculate bus mismatch | **calculate** prefix |
| `calculateBranchFlow(branch)` | 1285 | Calculate branch flow | **calculate** prefix |
| `solveLinearSystem(A, b)` | 1340 | LU decomposition solver | **solve** prefix |
| `calculatePQ(busIdx)` | 1394 | Calculate power at bus | **calculate** prefix |
| `buildFullJacobian()` | 1413 | Build full Jacobian | camelCase |
| `buildBMatrices()` | 1579 | Build B' and B'' matrices | camelCase |

---

### 10. `power_flow_process_visualizer.html`

**Purpose**: Original process visualizer

| Function | Line | Description | Naming Pattern |
|----------|------|-------------|----------------|
| `buildYbus()` | 945 | Build admittance matrix | camelCase |
| `calculateBusMismatch(bus)` | 1157 | Calculate bus mismatch | **calculate** prefix |
| `calculateBranchFlow(branch)` | 1189 | Calculate branch flow | **calculate** prefix |
| `calculateJacobian(busIdx, V, delta)` | 1240 | Build Jacobian | **calculate** prefix |
| `calculateBusMismatchValues(busIdx, V, delta)` | 1258 | Calculate mismatch values | **calculate** prefix |

---

### 11. `power_flow_visualizer.html`

**Purpose**: Multi-method power flow visualization

Contains algorithm visualization without standalone algorithm functions.

---

## Naming Pattern Analysis

### Current Inconsistencies

1. **Function Prefixes**:
   - Some files use `calculate*` prefix (original, v3, process visualizer)
   - Others use `calc*` prefix (v4-v7, v6_fixed)
   - Some use `solve*` prefix (power_flow_utils)
   - Class methods use no prefix

2. **Abbreviations**:
   - `nrStep()` vs `newtonRaphsonStep()` vs `newtonStep()`
   - `gsStep()` vs `gaussSeidelStep()`
   - `dcStep()` (consistent)

3. **Parameter Patterns**:
   - Some functions take `(V, delta)` directly
   - Others take `(prob, busIdx, V, delta)`
   - Class methods use `this.V, this.delta`

4. **Class vs Function Architecture**:
   - `power_flow_v5.html`, `power_flow_matpower_v2.html`, `power_flow_compare.html`, `dc_accuracy_analysis.html` use `PowerFlowEngine` class
   - Intuitive visualizers use standalone functions

---

## Sample Problem Data Structures

### MATPOWER Format (Recommended)

Used in: `power_flow_matpower_v2.html`, `power_flow_compare.html`

```javascript
const MATPOWER_CASES = {
    case14: {
        name: 'IEEE 14-bus',
        baseMVA: 100,
        bus: [
            // [bus_i, type, Pd, Qd, Gs, Bs, area, Vm, Va, baseKV, zone, Vmax, Vmin]
            [1, 3, 0, 0, 0, 0, 1, 1.06, 0, 0, 1, 1.06, 0.94],
            // ...
        ],
        gen: [
            // [bus, Pg, Qg, Qmax, Qmin, Vg, mBase, status, Pmax, Pmin]
            // ...
        ],
        branch: [
            // [fbus, tbus, r, x, b, rateA, rateB, rateC, ratio, angle, status]
            // ...
        ]
    }
};
```

### Simplified Format

Used in: `power_flow_v5.html`, `dc_accuracy_analysis.html`

```javascript
const CASES = {
    caseName: {
        name: 'Case Name',
        baseMVA: 100,
        bus: [...],
        gen: [...],
        branch: [...]
    }
};
```

---

## Recommended Standardization

Based on the spec requirements, the target patterns should be:

### Algorithm Function Naming

```javascript
/**
 * [Algorithm Name] Power Flow Method
 *
 * @description [Brief description of the algorithm and when to use it]
 * @param {Object} caseData - MATPOWER-compatible case data
 * @param {Object} options - Algorithm options
 * @param {number} options.tolerance - Convergence tolerance (default: 1e-6)
 * @param {number} options.maxIterations - Maximum iterations (default: 100)
 * @returns {Object} Solution containing voltages, powers, and convergence info
 */
function solveNewtonRaphson(caseData, options = {}) {
  const { tolerance = 1e-6, maxIterations = 100 } = options;
  // Implementation
}
```

### Sample Problem Naming

```javascript
/**
 * IEEE [N]-Bus Test System
 *
 * @description Standard IEEE test case for power flow analysis
 * @see [Reference to IEEE standard or paper]
 */
const IEEE_[N]_BUS = {
    // MATPOWER v2 format
};
```

---

## Utility Functions

### Common Utilities (to be centralized)

| Function | Description | Current Locations |
|----------|-------------|-------------------|
| `buildYbus()` | Build admittance matrix | Multiple files |
| `solveLinearSystem()` | LU decomposition solver | process_visualizer_v2 |
| `calcPowerInjection()` | Calculate P, Q at buses | matpower_v2, v5 |
| `calcMismatch()` | Calculate power mismatches | All files |
| `buildJacobian()` | Build Jacobian matrix | All files |
| `buildBMatrices()` | Build B' and B'' for FDLF | process_visualizer_v2 |

---

## Files Summary

| File | Algorithms | Architecture | Sample Data |
|------|------------|--------------|-------------|
| `power_flow_matpower_v2.html` | NR, FD | Class | MATPOWER_CASES |
| `power_flow_v5.html` | NR, GS, DC | Class | CASES |
| `power_flow_compare.html` | NR, FD-XB, FD-BX | Class | MATPOWER_CASES |
| `dc_accuracy_analysis.html` | DC, NR (reference) | Class | CASES |
| `power_flow_intuitive_v6_fixed.html` | NR, GS, DC | Functions | Embedded |
| `power_flow_intuitive_v7.html` | NR, GS, DC | Functions | Embedded |
| `power_flow_intuitive_v5/v6.html` | NR, GS, DC | Functions | Embedded |
| `power_flow_intuitive_v4.html` | NR, GS, DC | Functions | Embedded |
| `power_flow_intuitive.html` | NR, GS | Functions | Embedded |
| `power_flow_intuitive_v3.html` | NR, GS | Functions | Embedded |
| `power_flow_process_visualizer_v2.html` | NR, FD | Functions | Embedded |
| `power_flow_process_visualizer.html` | NR | Functions | Embedded |
| `power_flow_visualizer.html` | NR | Visualization | N/A |

---

**Document**: `algorithm_inventory.md`
**Created**: 2026-01-11
**Purpose**: Phase 1 - Setup & Audit
**Related**: See `docs/power_flow_methods.md` for algorithm theory
