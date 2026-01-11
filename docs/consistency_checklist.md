# Consistency Checklist

This document catalogs all inconsistencies identified in the Power Flow Visualization codebase, organized by category. Each item includes the current state, target state, affected files, and priority.

---

## Legend

| Priority | Description |
|----------|-------------|
| **P0** | Critical - Blocks other work |
| **P1** | High - Core functionality |
| **P2** | Medium - Code quality |
| **P3** | Low - Nice to have |

| Status | Description |
|--------|-------------|
| [ ] | Not started |
| [~] | In progress |
| [x] | Completed |

---

## 1. Algorithm Function Naming

### 1.1 Function Prefix Inconsistencies

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| FN-001 | `calculate*` prefix | `calc*` prefix | `power_flow_intuitive.html`, `power_flow_intuitive_v3.html`, `power_flow_process_visualizer.html`, `power_flow_process_visualizer_v2.html` | P1 | [ ] |
| FN-002 | `nrStep()` | `newtonRaphsonStep()` | `power_flow_v5.html` | P1 | [ ] |
| FN-003 | `gsStep()` | `gaussSeidelStep()` | `power_flow_v5.html` | P1 | [ ] |
| FN-004 | `dcStep()` | Keep as-is (consistent) | All files | N/A | [x] |
| FN-005 | `newtonStep()` | `newtonRaphsonStep()` | `power_flow_intuitive_v6_fixed.html`, `power_flow_intuitive_v7.html` | P2 | [ ] |

**Target Pattern**:
```javascript
// Main algorithm functions: solve[AlgorithmName]
function solveNewtonRaphson(caseData, options) { }
function solveGaussSeidel(caseData, options) { }
function solveDCPowerFlow(caseData, options) { }
function solveFastDecoupled(caseData, options) { }

// Step functions: [algorithmName]Step
function newtonRaphsonStep() { }
function gaussSeidelStep() { }
function dcStep() { }
function fastDecoupledStep() { }

// Calculation helpers: calc[What]
function calcMismatch() { }
function calcPowerInjection() { }
function calcJacobian() { }
```

---

### 1.2 JSDoc Documentation

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| DOC-001 | No JSDoc on algorithm functions | Add JSDoc with @param, @returns, @description | All HTML files | P1 | [ ] |
| DOC-002 | No JSDoc on utility functions | Add JSDoc with @param, @returns | All HTML files | P2 | [ ] |
| DOC-003 | No JSDoc on class methods | Add JSDoc with @param, @returns | `power_flow_v5.html`, `power_flow_matpower_v2.html`, `power_flow_compare.html` | P1 | [ ] |

**Target Pattern**:
```javascript
/**
 * Newton-Raphson Power Flow Step
 *
 * @description Performs one iteration of the Newton-Raphson method
 * @param {Object} state - Current solver state with V, delta arrays
 * @param {number} tolerance - Convergence tolerance (default: 1e-6)
 * @returns {Object} Updated state with new V, delta, and convergence info
 */
function newtonRaphsonStep(state, tolerance = 1e-6) { }
```

---

## 2. Sample Problem Data Structure

### 2.1 Constant Naming

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| SD-001 | `MATPOWER_CASES` | `IEEE_CASES` or keep as `MATPOWER_CASES` (decide) | `power_flow_matpower_v2.html`, `power_flow_compare.html` | P2 | [ ] |
| SD-002 | `CASES` | Align with `MATPOWER_CASES` | `power_flow_v5.html`, `dc_accuracy_analysis.html` | P2 | [ ] |
| SD-003 | `case14`, `case30` (camelCase) | `IEEE_14_BUS`, `IEEE_30_BUS` (SCREAMING_SNAKE_CASE) | All files with case data | P2 | [ ] |

**Target Pattern**:
```javascript
/**
 * IEEE 14-Bus Test System
 *
 * @description Standard IEEE test case for power flow analysis
 * @see IEEE Power Systems Test Case Archive
 */
const IEEE_14_BUS = {
    name: 'IEEE 14-Bus Test System',
    baseMVA: 100,
    // ...
};
```

---

### 2.2 Data Format Consistency

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| DF-001 | Mixed bus data column order | MATPOWER v2 standard column order | All files with embedded case data | P1 | [ ] |
| DF-002 | Missing column comments | Add column header comments | All files with embedded case data | P2 | [ ] |
| DF-003 | Inconsistent bus type values | Standardize: 1=PQ, 2=PV, 3=Slack | All files | P1 | [ ] |
| DF-004 | Missing header comments on case data | Add JSDoc block above each case | All files | P2 | [ ] |

**Target Format**:
```javascript
/**
 * IEEE 14-Bus Test System
 * @description Standard IEEE test case for power flow analysis
 */
const IEEE_14_BUS = {
    name: 'IEEE 14-Bus Test System',
    baseMVA: 100,

    // Bus data: [bus_i, type, Pd, Qd, Gs, Bs, area, Vm, Va, baseKV, zone, Vmax, Vmin]
    // Type: 1=PQ (load), 2=PV (generator), 3=Slack (reference)
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.06, 0, 0, 1, 1.06, 0.94],
        // ...
    ],

    // Generator data: [bus, Pg, Qg, Qmax, Qmin, Vg, mBase, status, Pmax, Pmin]
    gen: [
        // ...
    ],

    // Branch data: [fbus, tbus, r, x, b, rateA, rateB, rateC, ratio, angle, status, angmin, angmax]
    branch: [
        // ...
    ]
};
```

---

## 3. Architecture Consistency

### 3.1 Class vs Function Pattern

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| AR-001 | Mixed class/function architecture | Create shared modules | All files | P1 | [ ] |
| AR-002 | Duplicated `PowerFlowEngine` class | Single shared class module | `power_flow_v5.html`, `power_flow_matpower_v2.html`, `power_flow_compare.html`, `dc_accuracy_analysis.html` | P0 | [ ] |
| AR-003 | Duplicated utility functions | Single shared utilities module | All files | P0 | [ ] |
| AR-004 | Duplicated case data | Single shared IEEE cases module | All files with case data | P0 | [ ] |

**Target Architecture**:
```
scripts/
├── ieee_cases.js         # Shared IEEE test case data
├── power_flow_engine.js  # Shared PowerFlowEngine class
└── power_flow_utils.js   # Shared utility functions
```

---

### 3.2 Parameter Patterns

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| PP-001 | `calcMismatch(V, delta)` | `calcMismatch(state)` or class method | `power_flow_intuitive.html`, `power_flow_intuitive_v3.html` | P2 | [ ] |
| PP-002 | `calcPQ(prob, busIdx, V, delta)` | Consistent signature | `power_flow_intuitive_v4-v7.html` | P2 | [ ] |
| PP-003 | Class methods using `this.V, this.delta` | Document pattern | Class-based files | P3 | [ ] |

**Target Pattern**:
```javascript
// Standalone functions should accept consistent parameter objects
function calcMismatch(caseData, V, delta) { }

// Or use options pattern
function calcMismatch({ caseData, V, delta }) { }
```

---

## 4. Code Duplication

### 4.1 Duplicated Algorithm Implementations

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| DUP-001 | `buildYbus()` duplicated 6+ times | Centralize in `power_flow_utils.js` | All algorithm files | P0 | [ ] |
| DUP-002 | `solveLinearSystem()` duplicated | Centralize in `power_flow_utils.js` | `power_flow_process_visualizer_v2.html`, others | P1 | [ ] |
| DUP-003 | `calcPowerInjection()` duplicated | Centralize in `power_flow_utils.js` | Multiple files | P1 | [ ] |
| DUP-004 | `buildJacobian()` duplicated | Centralize in `power_flow_utils.js` | Multiple files | P1 | [ ] |
| DUP-005 | IEEE case data duplicated | Centralize in `ieee_cases.js` | All files with embedded case data | P0 | [ ] |

---

### 4.2 Duplicated UI Code

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| UI-001 | Duplicated convergence chart drawing | Consider shared module | Intuitive visualizers | P3 | [ ] |
| UI-002 | Duplicated algorithm button creation | Consider shared module | `power_flow_v5.html`, `power_flow_compare.html` | P3 | [ ] |

---

## 5. File Organization

### 5.1 Versioned Files

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| FO-001 | 6 versions of intuitive visualizer | Keep v6_fixed + v7, archive others | `power_flow_intuitive*.html` | P2 | [ ] |
| FO-002 | 2 versions of process visualizer | Keep v2, archive original | `power_flow_process_visualizer*.html` | P2 | [ ] |
| FO-003 | No archive directory | Create `archive/` with README | N/A | P2 | [ ] |

**Target Structure**:
```
/
├── power_flow_intuitive_v6_fixed.html  # Keep (recommended reference)
├── power_flow_intuitive_v7.html        # Keep (latest)
├── power_flow_process_visualizer_v2.html # Keep
├── archive/
│   ├── README.md                        # Explanation of archived files
│   ├── power_flow_intuitive.html        # Archived
│   ├── power_flow_intuitive_v3.html     # Archived
│   ├── power_flow_intuitive_v4.html     # Archived
│   ├── power_flow_intuitive_v5.html     # Archived
│   ├── power_flow_intuitive_v6.html     # Archived
│   └── power_flow_process_visualizer.html # Archived
```

---

## 6. Documentation

### 6.1 Inline Comments

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| IC-001 | Missing mathematical comments | Add step-by-step math explanations | Algorithm implementation sections | P2 | [ ] |
| IC-002 | Missing convergence explanation | Add iteration convergence comments | Newton-Raphson implementations | P2 | [ ] |
| IC-003 | Missing Jacobian explanation | Add Jacobian structure comments | `buildJacobian()` implementations | P2 | [ ] |

**Example Target**:
```javascript
// Newton-Raphson iteration step
// Mathematical model: F(x) = 0 where x = [delta, V]
// Update: x_new = x - J^(-1) * F(x)

// Calculate power mismatches: dP = P_spec - P_calc, dQ = Q_spec - Q_calc
const mismatches = calcMismatch(V, delta);

// Build Jacobian matrix (partial derivatives):
// J = | dP/dδ  dP/dV |
//     | dQ/dδ  dQ/dV |
const J = buildJacobian(V, delta);

// Solve linear system: J * dx = -F(x)
const dx = solveLinearSystem(J, mismatches);

// Update voltage angles and magnitudes
delta = delta.map((d, i) => d + dx[i]);
V = V.map((v, i) => v + dx[i + n]);
```

---

### 6.2 Markdown Documentation

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| MD-001 | Docs don't reference shared modules | Update to reference new module structure | `docs/*.md` | P2 | [ ] |
| MD-002 | Missing module structure documentation | Add architecture overview | `docs/README.md` or similar | P2 | [ ] |

---

## 7. Error Handling

| ID | Current | Target | Files Affected | Priority | Status |
|----|---------|--------|----------------|----------|--------|
| ERR-001 | Inconsistent convergence failure handling | Standardize error messages | All algorithm files | P2 | [ ] |
| ERR-002 | Missing input validation | Add case data validation | `PowerFlowEngine` class | P2 | [ ] |
| ERR-003 | Silent failures in some implementations | Add explicit error logging | Multiple files | P2 | [ ] |

---

## Summary

### By Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 4 | Critical - Must fix first (code duplication, architecture) |
| P1 | 11 | High - Core functionality improvements |
| P2 | 19 | Medium - Code quality improvements |
| P3 | 3 | Low - Nice to have |

### Implementation Order

1. **Phase 1 (Current)**: Audit and document (this checklist)
2. **Phase 2**: Create shared modules (`scripts/ieee_cases.js`, `scripts/power_flow_engine.js`, `scripts/power_flow_utils.js`)
3. **Phase 3**: Update algorithm files to use shared modules
4. **Phase 4**: Standardize intuitive visualizers
5. **Phase 5**: Add documentation and comments
6. **Phase 6**: Archive deprecated files
7. **Phase 7**: Final verification

---

**Document**: `consistency_checklist.md`
**Created**: 2026-01-11
**Purpose**: Phase 1 - Setup & Audit
**Related**: See `docs/algorithm_inventory.md` for detailed algorithm inventory
