/**
 * Power Flow Utility Functions Module
 *
 * @fileoverview This module provides utility functions for power flow analysis
 * including matrix operations, complex number arithmetic, convergence helpers,
 * and network construction utilities.
 *
 * @description A collection of reusable mathematical utilities designed for
 * power flow calculations. Includes linear algebra operations, power injection
 * calculations, admittance matrix construction, and convergence tracking.
 *
 * @see https://matpower.org - MATPOWER User's Manual
 * @see R. D. Zimmerman, C. E. Murillo-Sanchez (2020) MATPOWER 7.1
 *
 * @author Power Flow Visualization Project
 * @license MIT
 */

// ============================================================
// Constants
// ============================================================

/**
 * Numerical tolerance for matrix operations
 * @type {number}
 */
const MATRIX_TOLERANCE = 1e-12;

/**
 * Maximum condition number before warning
 * @type {number}
 */
const MAX_CONDITION_NUMBER = 1e12;

// ============================================================
// Complex Number Operations
// ============================================================

/**
 * Complex Number Utilities
 *
 * @description Provides basic complex number operations without external libraries.
 * Complex numbers are represented as objects with 're' (real) and 'im' (imaginary) properties.
 *
 * @namespace Complex
 */
const Complex = {
    /**
     * Create a complex number
     *
     * @param {number} re - Real part
     * @param {number} im - Imaginary part
     * @returns {Object} Complex number {re, im}
     */
    create(re = 0, im = 0) {
        return { re, im };
    },

    /**
     * Create a complex number from polar form
     *
     * @param {number} mag - Magnitude
     * @param {number} angle - Angle in radians
     * @returns {Object} Complex number {re, im}
     */
    fromPolar(mag, angle) {
        return {
            re: mag * Math.cos(angle),
            im: mag * Math.sin(angle)
        };
    },

    /**
     * Add two complex numbers
     *
     * @param {Object} a - First complex number
     * @param {Object} b - Second complex number
     * @returns {Object} Sum a + b
     */
    add(a, b) {
        return {
            re: a.re + b.re,
            im: a.im + b.im
        };
    },

    /**
     * Subtract two complex numbers
     *
     * @param {Object} a - First complex number
     * @param {Object} b - Second complex number
     * @returns {Object} Difference a - b
     */
    subtract(a, b) {
        return {
            re: a.re - b.re,
            im: a.im - b.im
        };
    },

    /**
     * Multiply two complex numbers
     *
     * @description (a + bi)(c + di) = (ac - bd) + (ad + bc)i
     *
     * @param {Object} a - First complex number
     * @param {Object} b - Second complex number
     * @returns {Object} Product a * b
     */
    multiply(a, b) {
        return {
            re: a.re * b.re - a.im * b.im,
            im: a.re * b.im + a.im * b.re
        };
    },

    /**
     * Divide two complex numbers
     *
     * @description (a + bi)/(c + di) = (ac + bd)/(c^2 + d^2) + (bc - ad)/(c^2 + d^2)i
     *
     * @param {Object} a - Numerator complex number
     * @param {Object} b - Denominator complex number
     * @returns {Object} Quotient a / b
     */
    divide(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        if (denom < MATRIX_TOLERANCE) {
            return { re: 0, im: 0 };
        }
        return {
            re: (a.re * b.re + a.im * b.im) / denom,
            im: (a.im * b.re - a.re * b.im) / denom
        };
    },

    /**
     * Get complex conjugate
     *
     * @param {Object} z - Complex number
     * @returns {Object} Conjugate z*
     */
    conjugate(z) {
        return {
            re: z.re,
            im: -z.im
        };
    },

    /**
     * Get magnitude (absolute value) of complex number
     *
     * @param {Object} z - Complex number
     * @returns {number} |z|
     */
    abs(z) {
        return Math.sqrt(z.re * z.re + z.im * z.im);
    },

    /**
     * Get angle (argument) of complex number in radians
     *
     * @param {Object} z - Complex number
     * @returns {number} arg(z) in radians
     */
    angle(z) {
        return Math.atan2(z.im, z.re);
    },

    /**
     * Scale complex number by real scalar
     *
     * @param {Object} z - Complex number
     * @param {number} k - Scalar
     * @returns {Object} k * z
     */
    scale(z, k) {
        return {
            re: z.re * k,
            im: z.im * k
        };
    }
};

// ============================================================
// Matrix Operations
// ============================================================

/**
 * Create a zero matrix
 *
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {Array<Array<number>>} Zero matrix
 */
function createZeroMatrix(rows, cols) {
    return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

/**
 * Create an identity matrix
 *
 * @param {number} n - Matrix dimension
 * @returns {Array<Array<number>>} Identity matrix
 */
function createIdentityMatrix(n) {
    const I = createZeroMatrix(n, n);
    for (let i = 0; i < n; i++) {
        I[i][i] = 1;
    }
    return I;
}

/**
 * Create a complex zero matrix
 *
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {Array<Array<Object>>} Complex zero matrix
 */
function createComplexZeroMatrix(rows, cols) {
    return Array(rows).fill(null).map(() =>
        Array(cols).fill(null).map(() => Complex.create(0, 0))
    );
}

/**
 * Deep copy a matrix
 *
 * @param {Array<Array<number>>} A - Matrix to copy
 * @returns {Array<Array<number>>} Deep copy of matrix
 */
function copyMatrix(A) {
    return A.map(row => [...row]);
}

/**
 * Add two matrices
 *
 * @param {Array<Array<number>>} A - First matrix
 * @param {Array<Array<number>>} B - Second matrix
 * @returns {Array<Array<number>>} Sum A + B
 * @throws {Error} If matrix dimensions don't match
 */
function addMatrix(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) {
        throw new Error('Matrix dimensions must match for addition');
    }
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

/**
 * Subtract two matrices
 *
 * @param {Array<Array<number>>} A - First matrix
 * @param {Array<Array<number>>} B - Second matrix
 * @returns {Array<Array<number>>} Difference A - B
 * @throws {Error} If matrix dimensions don't match
 */
function subtractMatrix(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) {
        throw new Error('Matrix dimensions must match for subtraction');
    }
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

/**
 * Multiply two matrices
 *
 * @param {Array<Array<number>>} A - First matrix (m x n)
 * @param {Array<Array<number>>} B - Second matrix (n x p)
 * @returns {Array<Array<number>>} Product A * B (m x p)
 * @throws {Error} If inner dimensions don't match
 */
function multiplyMatrix(A, B) {
    const m = A.length;
    const n = A[0].length;
    const p = B[0].length;

    if (n !== B.length) {
        throw new Error('Inner matrix dimensions must match for multiplication');
    }

    const C = createZeroMatrix(m, p);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
            for (let k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

/**
 * Transpose a matrix
 *
 * @param {Array<Array<number>>} A - Matrix to transpose
 * @returns {Array<Array<number>>} Transposed matrix A^T
 */
function transposeMatrix(A) {
    const m = A.length;
    const n = A[0].length;
    const T = createZeroMatrix(n, m);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            T[j][i] = A[i][j];
        }
    }
    return T;
}

/**
 * Scale a matrix by a scalar
 *
 * @param {Array<Array<number>>} A - Matrix to scale
 * @param {number} k - Scalar value
 * @returns {Array<Array<number>>} Scaled matrix k * A
 */
function scaleMatrix(A, k) {
    return A.map(row => row.map(val => val * k));
}

/**
 * Matrix-vector multiplication
 *
 * @param {Array<Array<number>>} A - Matrix (m x n)
 * @param {Array<number>} v - Vector (length n)
 * @returns {Array<number>} Result vector A * v (length m)
 * @throws {Error} If dimensions don't match
 */
function multiplyMatrixVector(A, v) {
    const m = A.length;
    const n = A[0].length;

    if (n !== v.length) {
        throw new Error('Matrix columns must match vector length');
    }

    const result = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            result[i] += A[i][j] * v[j];
        }
    }
    return result;
}

/**
 * Calculate the Frobenius norm of a matrix
 *
 * @param {Array<Array<number>>} A - Matrix
 * @returns {number} Frobenius norm ||A||_F
 */
function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < A[0].length; j++) {
            sum += A[i][j] * A[i][j];
        }
    }
    return Math.sqrt(sum);
}

/**
 * Calculate the infinity norm (max row sum) of a matrix
 *
 * @param {Array<Array<number>>} A - Matrix
 * @returns {number} Infinity norm ||A||_inf
 */
function infinityNorm(A) {
    let maxSum = 0;
    for (let i = 0; i < A.length; i++) {
        let rowSum = 0;
        for (let j = 0; j < A[0].length; j++) {
            rowSum += Math.abs(A[i][j]);
        }
        maxSum = Math.max(maxSum, rowSum);
    }
    return maxSum;
}

// ============================================================
// Linear System Solvers
// ============================================================

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting
 *
 * @description Implements Gaussian elimination with partial pivoting for
 * numerical stability. Creates an augmented matrix [A|b] and performs
 * forward elimination followed by back substitution.
 *
 * Mathematical steps:
 *   1. Form augmented matrix [A|b]
 *   2. For each column k:
 *      - Find pivot (largest element in column below diagonal)
 *      - Swap rows if necessary
 *      - Eliminate elements below pivot
 *   3. Back substitution to find solution
 *
 * @param {Array<Array<number>>} A - Coefficient matrix (n x n)
 * @param {Array<number>} b - Right-hand side vector (length n)
 * @returns {Array<number>|null} Solution vector x, or null if singular
 */
function solveLinearSystem(A, b) {
    const n = A.length;
    if (n === 0) return [];

    // Check dimensions
    if (A[0].length !== n) {
        return null;
    }
    if (b.length !== n) {
        return null;
    }

    // Create augmented matrix [A|b] (deep copy)
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug.push([...A[i], b[i]]);
    }

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        // Find pivot row (maximum element in column)
        let maxRow = col;
        let maxVal = Math.abs(aug[col][col]);

        for (let row = col + 1; row < n; row++) {
            const absVal = Math.abs(aug[row][col]);
            if (absVal > maxVal) {
                maxVal = absVal;
                maxRow = row;
            }
        }

        // Swap rows if needed
        if (maxRow !== col) {
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        }

        // Check for singular or near-singular matrix
        if (Math.abs(aug[col][col]) < MATRIX_TOLERANCE) {
            // Matrix is singular or nearly singular
            // Use small pivot to continue (may produce inaccurate results)
            aug[col][col] = MATRIX_TOLERANCE;
        }

        // Eliminate elements below pivot
        for (let row = col + 1; row < n; row++) {
            const factor = aug[row][col] / aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= aug[i][j] * x[j];
        }

        if (Math.abs(aug[i][i]) < MATRIX_TOLERANCE) {
            x[i] = 0;
        } else {
            x[i] = sum / aug[i][i];
        }
    }

    // Check for NaN or Infinity in solution
    for (let i = 0; i < n; i++) {
        if (!isFinite(x[i])) {
            return null;
        }
    }

    return x;
}

/**
 * Solve linear system using LU decomposition with partial pivoting
 *
 * @description LU decomposition factors A = PLU where:
 *   - P is a permutation matrix (stored as index array)
 *   - L is lower triangular with ones on diagonal
 *   - U is upper triangular
 *
 * The solution is found by:
 *   1. Solve Ly = Pb (forward substitution)
 *   2. Solve Ux = y (backward substitution)
 *
 * @param {Array<Array<number>>} A - Coefficient matrix (n x n)
 * @param {Array<number>} b - Right-hand side vector (length n)
 * @returns {Array<number>|null} Solution vector x, or null if singular
 */
function solveLU(A, b) {
    const n = A.length;
    if (n === 0) return [];

    try {
        // Create working copy for LU factorization
        const LU = copyMatrix(A);
        const P = Array.from({ length: n }, (_, i) => i);

        // LU factorization with partial pivoting
        for (let k = 0; k < n; k++) {
            // Find pivot
            let maxVal = Math.abs(LU[k][k]);
            let maxIdx = k;
            for (let i = k + 1; i < n; i++) {
                if (Math.abs(LU[i][k]) > maxVal) {
                    maxVal = Math.abs(LU[i][k]);
                    maxIdx = i;
                }
            }

            // Swap rows if needed
            if (maxIdx !== k) {
                [LU[k], LU[maxIdx]] = [LU[maxIdx], LU[k]];
                [P[k], P[maxIdx]] = [P[maxIdx], P[k]];
            }

            // Handle near-singular matrix
            if (Math.abs(LU[k][k]) < MATRIX_TOLERANCE) {
                LU[k][k] = MATRIX_TOLERANCE;
            }

            // Elimination step (compute L and U simultaneously)
            for (let i = k + 1; i < n; i++) {
                LU[i][k] /= LU[k][k];  // Store L factor
                for (let j = k + 1; j < n; j++) {
                    LU[i][j] -= LU[i][k] * LU[k][j];  // Update U
                }
            }
        }

        // Forward substitution (solve Ly = Pb)
        const y = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            y[i] = b[P[i]];
            for (let j = 0; j < i; j++) {
                y[i] -= LU[i][j] * y[j];
            }
        }

        // Backward substitution (solve Ux = y)
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = y[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= LU[i][j] * x[j];
            }
            x[i] /= LU[i][i];
        }

        // Check for NaN or Infinity
        for (let i = 0; i < n; i++) {
            if (!isFinite(x[i])) {
                return null;
            }
        }

        return x;
    } catch (e) {
        return null;
    }
}

// ============================================================
// Ybus Construction
// ============================================================

/**
 * Build bus admittance matrix (Ybus) from branch data
 *
 * @description Constructs the Ybus matrix from branch data. Handles
 * transmission lines with series impedance and shunt admittance,
 * as well as transformers with off-nominal tap ratios.
 *
 * Mathematical formulation:
 *   For a branch from bus i to bus j with impedance z = r + jx:
 *   - Series admittance: y = 1/z = g + jb where g = r/(r² + x²), b = -x/(r² + x²)
 *   - Off-diagonal elements: Yij = Yji = -y/tap
 *   - Diagonal contributions: Yii += y/tap² + jB/2, Yjj += y + jB/2
 *
 * @param {number} nBus - Number of buses
 * @param {Array<Object>} branches - Branch data array
 * @param {number} branches[].from - From bus index (0-indexed)
 * @param {number} branches[].to - To bus index (0-indexed)
 * @param {number} branches[].r - Resistance (p.u.)
 * @param {number} branches[].x - Reactance (p.u.)
 * @param {number} branches[].b - Total line charging (p.u.)
 * @param {number} [branches[].tap=1] - Transformer tap ratio (1 for line)
 * @returns {Object} Ybus with re and im arrays
 */
function buildYbus(nBus, branches) {
    // Initialize Ybus as zero matrix with separate real and imaginary parts
    const Ybus = {
        re: createZeroMatrix(nBus, nBus),
        im: createZeroMatrix(nBus, nBus)
    };

    // Process each branch
    for (const branch of branches) {
        const from = branch.from;
        const to = branch.to;
        let r = branch.r;
        let x = branch.x;
        const b = branch.b || 0;
        const tap = branch.tap || 1;

        // Handle zero impedance branches (treat as very small impedance)
        if (Math.abs(r) < 1e-8 && Math.abs(x) < 1e-8) continue;
        if (Math.abs(r) < 1e-8) r = 1e-6;
        if (Math.abs(x) < 1e-8) x = 1e-6;

        // Calculate series admittance: y = 1/(r + jx) = (r - jx)/(r² + x²)
        const z2 = r * r + x * x;
        const g = r / z2;           // Conductance (real part)
        const bSeries = -x / z2;    // Susceptance (imaginary part)

        // Handle tap ratio (0 means transmission line, use 1)
        const tapRatio = tap === 0 ? 1 : tap;

        // Off-diagonal elements: Yij = -y/tap
        Ybus.re[from][to] -= g / tapRatio;
        Ybus.im[from][to] -= bSeries / tapRatio;
        Ybus.re[to][from] -= g / tapRatio;
        Ybus.im[to][from] -= bSeries / tapRatio;

        // Diagonal elements: include tap ratio effects and line charging
        // From-bus: y/tap² + jB/2
        Ybus.re[from][from] += g / (tapRatio * tapRatio);
        Ybus.im[from][from] += bSeries / (tapRatio * tapRatio) + b / 2;
        // To-bus: y + jB/2
        Ybus.re[to][to] += g;
        Ybus.im[to][to] += bSeries + b / 2;
    }

    return Ybus;
}

/**
 * Build bus admittance matrix from MATPOWER format branch data
 *
 * @description Converts MATPOWER branch array format to Ybus matrix.
 * Branch columns: [F_BUS, T_BUS, BR_R, BR_X, BR_B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
 *
 * @param {number} nBus - Number of buses
 * @param {Array<Array<number>>} branchData - MATPOWER format branch array
 * @param {number} [baseMVA=100] - Base MVA
 * @returns {Object} Ybus with re and im arrays
 */
function buildYbusFromMATpower(nBus, branchData, baseMVA = 100) {
    const branches = branchData.map(br => ({
        from: br[0] - 1,    // Convert to 0-indexed
        to: br[1] - 1,      // Convert to 0-indexed
        r: br[2],
        x: br[3],
        b: br[4],
        tap: br[8] || 1
    }));

    return buildYbus(nBus, branches);
}

// ============================================================
// Power Flow Calculations
// ============================================================

/**
 * Calculate power injections at a bus
 *
 * @description Computes complex power injection at a bus using:
 *   Pi = sum_j(Vi * Vj * (Gij * cos(δi - δj) + Bij * sin(δi - δj)))
 *   Qi = sum_j(Vi * Vj * (Gij * sin(δi - δj) - Bij * cos(δi - δj)))
 *
 * @param {number} busIdx - Bus index (0-indexed)
 * @param {Array<number>} V - Voltage magnitudes (p.u.)
 * @param {Array<number>} delta - Voltage angles (radians)
 * @param {Object} Ybus - Admittance matrix with re and im arrays
 * @returns {Object} Power injection {P, Q}
 */
function calcPowerInjection(busIdx, V, delta, Ybus) {
    const n = V.length;
    let P = 0;
    let Q = 0;

    const Vi = V[busIdx];
    const deltai = delta[busIdx];

    for (let j = 0; j < n; j++) {
        const Vj = V[j];
        const deltaj = delta[j];
        const Gij = Ybus.re[busIdx][j];
        const Bij = Ybus.im[busIdx][j];
        const thetaij = deltai - deltaj;

        // Power injection equations in polar form
        P += Vi * Vj * (Gij * Math.cos(thetaij) + Bij * Math.sin(thetaij));
        Q += Vi * Vj * (Gij * Math.sin(thetaij) - Bij * Math.cos(thetaij));
    }

    return { P, Q };
}

/**
 * Calculate all power injections for a network
 *
 * @param {Array<number>} V - Voltage magnitudes (p.u.)
 * @param {Array<number>} delta - Voltage angles (radians)
 * @param {Object} Ybus - Admittance matrix
 * @returns {Object} Arrays of P and Q injections
 */
function calcAllPowerInjections(V, delta, Ybus) {
    const n = V.length;
    const P = new Array(n);
    const Q = new Array(n);

    for (let i = 0; i < n; i++) {
        const inj = calcPowerInjection(i, V, delta, Ybus);
        P[i] = inj.P;
        Q[i] = inj.Q;
    }

    return { P, Q };
}

/**
 * Calculate power mismatches at all buses
 *
 * @description Computes the difference between specified and calculated power:
 *   ΔP = Pspec - Pcalc = (Pgen - Pload) - Pcalc
 *   ΔQ = Qspec - Qcalc = (Qgen - Qload) - Qcalc
 *
 * @param {Array<number>} Pspec - Specified active power (p.u.)
 * @param {Array<number>} Qspec - Specified reactive power (p.u.)
 * @param {Array<number>} V - Voltage magnitudes (p.u.)
 * @param {Array<number>} delta - Voltage angles (radians)
 * @param {Object} Ybus - Admittance matrix
 * @param {number} slackBus - Slack bus index (0-indexed)
 * @param {Array<number>} pvBuses - PV bus indices (0-indexed)
 * @returns {Object} Mismatch data {deltaP, deltaQ, maxP, maxQ, maxError}
 */
function calcMismatch(Pspec, Qspec, V, delta, Ybus, slackBus, pvBuses) {
    const n = V.length;
    const { P, Q } = calcAllPowerInjections(V, delta, Ybus);

    const deltaP = [];
    const deltaQ = [];
    let maxP = 0;
    let maxQ = 0;

    for (let i = 0; i < n; i++) {
        // Skip slack bus
        if (i === slackBus) continue;

        // Active power mismatch (for all non-slack buses)
        const dP = Pspec[i] - P[i];
        deltaP.push({ bus: i, value: dP });
        maxP = Math.max(maxP, Math.abs(dP));

        // Reactive power mismatch (only for PQ buses)
        if (!pvBuses.includes(i)) {
            const dQ = Qspec[i] - Q[i];
            deltaQ.push({ bus: i, value: dQ });
            maxQ = Math.max(maxQ, Math.abs(dQ));
        }
    }

    return {
        deltaP,
        deltaQ,
        Pcalc: P,
        Qcalc: Q,
        maxP,
        maxQ,
        maxError: Math.max(maxP, maxQ)
    };
}

/**
 * Calculate branch power flow
 *
 * @description Calculates active power flow from bus i to bus j.
 *   Pij = Vi² * g - Vi * Vj * (g * cos(δi - δj) + b * sin(δi - δj))
 *
 * @param {Object} branch - Branch data {from, to, r, x, b}
 * @param {Array<number>} V - Voltage magnitudes
 * @param {Array<number>} delta - Voltage angles (radians)
 * @returns {number} Active power flow (p.u.)
 */
function calcBranchFlow(branch, V, delta) {
    const Vi = V[branch.from];
    const Vj = V[branch.to];
    const di = delta[branch.from];
    const dj = delta[branch.to];

    const { r, x } = branch;
    const denom = r * r + x * x;

    if (denom < MATRIX_TOLERANCE) {
        return 0;
    }

    const g = r / denom;
    const b = -x / denom;
    const theta = di - dj;

    const Pij = Vi * Vi * g - Vi * Vj * (g * Math.cos(theta) + b * Math.sin(theta));
    return Pij;
}

// ============================================================
// Convergence Helpers
// ============================================================

/**
 * Convergence Tracker class
 *
 * @description Tracks convergence history during iterative power flow solution.
 * Records error at each iteration and provides convergence analysis.
 *
 * @class
 */
class ConvergenceTracker {
    /**
     * Create a ConvergenceTracker
     *
     * @param {number} tolerance - Convergence tolerance (p.u.)
     * @param {number} maxIterations - Maximum iterations allowed
     */
    constructor(tolerance = 1e-6, maxIterations = 100) {
        this.tolerance = tolerance;
        this.maxIterations = maxIterations;
        this.history = [];
        this.converged = false;
        this.diverged = false;
    }

    /**
     * Record an iteration
     *
     * @param {number} iteration - Current iteration number
     * @param {number} maxPError - Maximum active power mismatch
     * @param {number} maxQError - Maximum reactive power mismatch
     * @returns {Object} Status {converged, diverged, maxError}
     */
    record(iteration, maxPError, maxQError) {
        const maxError = Math.max(maxPError, maxQError);

        this.history.push({
            iteration,
            maxP: maxPError,
            maxQ: maxQError,
            max: maxError,
            timestamp: Date.now()
        });

        // Check convergence
        if (maxError < this.tolerance) {
            this.converged = true;
        }

        // Check divergence (error increased significantly or not finite)
        if (!isFinite(maxError) || maxError > 1e10) {
            this.diverged = true;
        }

        // Check for oscillation or slow convergence
        if (this.history.length > 10) {
            const recent = this.history.slice(-5);
            const errors = recent.map(h => h.max);
            const increasing = errors.every((e, i) => i === 0 || e >= errors[i - 1] * 0.999);
            if (increasing && maxError > this.tolerance * 10) {
                this.diverged = true;
            }
        }

        return {
            converged: this.converged,
            diverged: this.diverged,
            maxError
        };
    }

    /**
     * Reset the tracker
     */
    reset() {
        this.history = [];
        this.converged = false;
        this.diverged = false;
    }

    /**
     * Get convergence rate (ratio of consecutive errors)
     *
     * @returns {number} Average convergence rate
     */
    getConvergenceRate() {
        if (this.history.length < 2) return 1;

        let rateSum = 0;
        let count = 0;

        for (let i = 1; i < this.history.length; i++) {
            const prev = this.history[i - 1].max;
            const curr = this.history[i].max;
            if (prev > MATRIX_TOLERANCE) {
                rateSum += curr / prev;
                count++;
            }
        }

        return count > 0 ? rateSum / count : 1;
    }

    /**
     * Get convergence summary
     *
     * @returns {Object} Summary {converged, iterations, finalError, rate}
     */
    getSummary() {
        const lastEntry = this.history[this.history.length - 1];
        return {
            converged: this.converged,
            diverged: this.diverged,
            iterations: this.history.length,
            finalError: lastEntry ? lastEntry.max : null,
            rate: this.getConvergenceRate(),
            history: [...this.history]
        };
    }
}

/**
 * Check if solution has converged
 *
 * @param {number} maxError - Maximum power mismatch
 * @param {number} tolerance - Convergence tolerance
 * @returns {boolean} True if converged
 */
function checkConvergence(maxError, tolerance) {
    return isFinite(maxError) && maxError < tolerance;
}

/**
 * Estimate iterations to convergence
 *
 * @description Based on current convergence rate, estimates remaining iterations.
 *
 * @param {number} currentError - Current maximum error
 * @param {number} tolerance - Target tolerance
 * @param {number} rate - Convergence rate (ratio of consecutive errors)
 * @returns {number} Estimated remaining iterations
 */
function estimateRemainingIterations(currentError, tolerance, rate) {
    if (rate >= 1 || rate <= 0 || currentError <= tolerance) {
        return rate >= 1 ? Infinity : 0;
    }

    // error_n = error_0 * rate^n
    // tolerance = currentError * rate^n
    // n = log(tolerance/currentError) / log(rate)
    return Math.ceil(Math.log(tolerance / currentError) / Math.log(rate));
}

// ============================================================
// Angle Utilities
// ============================================================

/**
 * Convert degrees to radians
 *
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function deg2rad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 *
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
function rad2deg(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Normalize angle to [-π, π] range
 *
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle in radians
 */
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// ============================================================
// Vector Operations
// ============================================================

/**
 * Calculate L2 norm (Euclidean length) of a vector
 *
 * @param {Array<number>} v - Vector
 * @returns {number} ||v||_2
 */
function vectorNorm(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}

/**
 * Calculate infinity norm (max absolute value) of a vector
 *
 * @param {Array<number>} v - Vector
 * @returns {number} ||v||_inf
 */
function vectorInfNorm(v) {
    let maxVal = 0;
    for (let i = 0; i < v.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(v[i]));
    }
    return maxVal;
}

/**
 * Add two vectors
 *
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {Array<number>} Sum a + b
 */
function vectorAdd(a, b) {
    return a.map((val, i) => val + b[i]);
}

/**
 * Subtract two vectors
 *
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {Array<number>} Difference a - b
 */
function vectorSubtract(a, b) {
    return a.map((val, i) => val - b[i]);
}

/**
 * Scale a vector by a scalar
 *
 * @param {Array<number>} v - Vector
 * @param {number} k - Scalar
 * @returns {Array<number>} Scaled vector k * v
 */
function vectorScale(v, k) {
    return v.map(val => val * k);
}

/**
 * Dot product of two vectors
 *
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {number} Dot product a · b
 */
function vectorDot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

// ============================================================
// Export for Browser and Module Systems
// ============================================================

// For browser global scope
if (typeof window !== 'undefined') {
    // Complex number utilities
    window.Complex = Complex;

    // Matrix operations
    window.createZeroMatrix = createZeroMatrix;
    window.createIdentityMatrix = createIdentityMatrix;
    window.createComplexZeroMatrix = createComplexZeroMatrix;
    window.copyMatrix = copyMatrix;
    window.addMatrix = addMatrix;
    window.subtractMatrix = subtractMatrix;
    window.multiplyMatrix = multiplyMatrix;
    window.transposeMatrix = transposeMatrix;
    window.scaleMatrix = scaleMatrix;
    window.multiplyMatrixVector = multiplyMatrixVector;
    window.frobeniusNorm = frobeniusNorm;
    window.infinityNorm = infinityNorm;

    // Linear solvers
    window.solveLinearSystem = solveLinearSystem;
    window.solveLU = solveLU;

    // Ybus construction
    window.buildYbus = buildYbus;
    window.buildYbusFromMATpower = buildYbusFromMATpower;

    // Power calculations
    window.calcPowerInjection = calcPowerInjection;
    window.calcAllPowerInjections = calcAllPowerInjections;
    window.calcMismatch = calcMismatch;
    window.calcBranchFlow = calcBranchFlow;

    // Convergence helpers
    window.ConvergenceTracker = ConvergenceTracker;
    window.checkConvergence = checkConvergence;
    window.estimateRemainingIterations = estimateRemainingIterations;

    // Angle utilities
    window.deg2rad = deg2rad;
    window.rad2deg = rad2deg;
    window.normalizeAngle = normalizeAngle;

    // Vector operations
    window.vectorNorm = vectorNorm;
    window.vectorInfNorm = vectorInfNorm;
    window.vectorAdd = vectorAdd;
    window.vectorSubtract = vectorSubtract;
    window.vectorScale = vectorScale;
    window.vectorDot = vectorDot;

    // Constants
    window.MATRIX_TOLERANCE = MATRIX_TOLERANCE;
}

// For ES6 module systems
export {
    // Constants
    MATRIX_TOLERANCE,
    MAX_CONDITION_NUMBER,

    // Complex number utilities
    Complex,

    // Matrix operations
    createZeroMatrix,
    createIdentityMatrix,
    createComplexZeroMatrix,
    copyMatrix,
    addMatrix,
    subtractMatrix,
    multiplyMatrix,
    transposeMatrix,
    scaleMatrix,
    multiplyMatrixVector,
    frobeniusNorm,
    infinityNorm,

    // Linear solvers
    solveLinearSystem,
    solveLU,

    // Ybus construction
    buildYbus,
    buildYbusFromMATpower,

    // Power calculations
    calcPowerInjection,
    calcAllPowerInjections,
    calcMismatch,
    calcBranchFlow,

    // Convergence helpers
    ConvergenceTracker,
    checkConvergence,
    estimateRemainingIterations,

    // Angle utilities
    deg2rad,
    rad2deg,
    normalizeAngle,

    // Vector operations
    vectorNorm,
    vectorInfNorm,
    vectorAdd,
    vectorSubtract,
    vectorScale,
    vectorDot
};
