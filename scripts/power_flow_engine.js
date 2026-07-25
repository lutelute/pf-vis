/**
 * Power Flow Engine Module
 *
 * @fileoverview This module provides the PowerFlowEngine class for solving
 * AC and DC power flow problems using various iterative methods including
 * Newton-Raphson, Fast Decoupled, Gauss-Seidel, and DC Power Flow.
 *
 * @description A MATPOWER-compatible power flow solver designed for educational
 * visualization. Implements standard power flow algorithms with consistent
 * interfaces and comprehensive documentation of mathematical operations.
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
 * Bus type constants matching MATPOWER convention
 *
 * Bus Classification in Power Flow Analysis:
 *   - Slack (Type 3): Reference bus with known |V| and θ (typically θ = 0°)
 *                     Balances system power: P_slack = Σ P_load - Σ P_gen (other)
 *   - PV (Type 2):    Generator bus with known P and |V|, solves for Q and θ
 *                     Subject to reactive power limits: Q_min ≤ Q ≤ Q_max
 *   - PQ (Type 1):    Load bus with known P and Q, solves for |V| and θ
 *                     Most common bus type in practical power systems
 *
 * @type {Object.<string, number>}
 */
const BUS_TYPE = {
    PQ: 1,      // PQ bus - both P and Q are specified, solve for |V| and θ
    PV: 2,      // PV bus - P and |V| specified, solve for Q and θ
    SLACK: 3    // Slack/Reference bus - |V| and θ specified, solve for P and Q
};

/**
 * Default algorithm options
 * @type {Object}
 */
const DEFAULT_OPTIONS = {
    tolerance: 1e-6,        // Convergence tolerance (p.u.)
    maxIterations: 100,     // Maximum number of iterations
    algorithm: 'nr'         // Default algorithm: 'nr', 'fdxb', 'gs', 'dc'
};

// ============================================================
// PowerFlowEngine Class
// ============================================================

/**
 * Power Flow Engine Class
 *
 * @description Main class for power flow calculations. Supports Newton-Raphson,
 * Fast Decoupled XB, Gauss-Seidel, and DC Power Flow methods. Uses MATPOWER
 * data format conventions for input case data.
 *
 * @class
 * @example
 * // Create engine with IEEE 14-bus case data
 * const engine = new PowerFlowEngine(IEEE_14_BUS);
 *
 * // Run Newton-Raphson power flow
 * const result = engine.solve({ algorithm: 'nr', tolerance: 1e-6 });
 *
 * // Check convergence
 * if (result.converged) {
 *     console.log('Converged in', result.iterations, 'iterations');
 * }
 */
class PowerFlowEngine {
    /**
     * Create a PowerFlowEngine instance
     *
     * @param {Object} caseData - MATPOWER-compatible case data
     * @param {string} caseData.name - System name
     * @param {number} caseData.baseMVA - Base power in MVA
     * @param {Array<Array<number>>} caseData.bus - Bus data matrix
     * @param {Array<Array<number>>} caseData.gen - Generator data matrix
     * @param {Array<Array<number>>} caseData.branch - Branch data matrix
     * @throws {Error} If case data is invalid or incomplete
     */
    constructor(caseData) {
        // Validate input
        if (!caseData || !caseData.bus || !caseData.gen || !caseData.branch) {
            throw new Error('Invalid case data: missing required arrays (bus, gen, branch)');
        }

        // Store base values
        this.baseMVA = caseData.baseMVA || 100;
        this.name = caseData.name || 'Unnamed System';

        // Deep copy data to prevent mutation
        this.busData = JSON.parse(JSON.stringify(caseData.bus));
        this.genData = JSON.parse(JSON.stringify(caseData.gen));
        this.branchData = JSON.parse(JSON.stringify(caseData.branch));

        // System dimensions
        this.nBus = this.busData.length;
        this.nBranch = this.branchData.length;
        this.nGen = this.genData.length;

        // State variables (to be initialized)
        this.V = [];        // Voltage magnitudes (p.u.)
        this.delta = [];    // Voltage angles (radians)
        this.Pgen = [];     // Generator active power (p.u.)
        this.Qgen = [];     // Generator reactive power (p.u.)

        // Bus classification
        this.slackBus = -1;
        this.pvBuses = [];
        this.pqBuses = [];

        // Admittance matrix (Ybus)
        // Stored as separate real (conductance) and imaginary (susceptance) parts
        this.Ybus = { re: [], im: [] };

        // Convergence tracking
        this.iteration = 0;
        this.converged = false;
        this.errorHistory = [];
        this.maxPError = 0;
        this.maxQError = 0;

        // Initialize the system
        this._initialize();
    }

    /**
     * Initialize the power flow problem
     *
     * @private
     * @description Sets up initial voltage profile, classifies buses by type,
     * applies generator setpoints, and builds the admittance matrix.
     */
    _initialize() {
        // Initialize voltage from bus data (flat start with bus voltage setpoints)
        for (let i = 0; i < this.nBus; i++) {
            const bus = this.busData[i];
            // Column 7: VM (voltage magnitude), Column 8: VA (voltage angle in degrees)
            this.V[i] = bus[7];
            this.delta[i] = bus[8] * Math.PI / 180;  // Convert degrees to radians

            // Classify bus by type (Column 1: BUS_TYPE)
            if (bus[1] === BUS_TYPE.SLACK) {
                this.slackBus = i;
            } else if (bus[1] === BUS_TYPE.PV) {
                this.pvBuses.push(i);
            } else {
                this.pqBuses.push(i);
            }
        }

        // Check for valid slack bus
        if (this.slackBus < 0) {
            throw new Error('No slack bus (type 3) found in bus data');
        }

        // Initialize generator power arrays
        this.Pgen = new Array(this.nBus).fill(0);
        this.Qgen = new Array(this.nBus).fill(0);

        // Apply generator data
        for (const gen of this.genData) {
            const busIdx = gen[0] - 1;  // Convert 1-indexed to 0-indexed

            // Column 1: PG (MW), Column 2: QG (MVAr) - convert to p.u.
            this.Pgen[busIdx] += gen[1] / this.baseMVA;
            this.Qgen[busIdx] += gen[2] / this.baseMVA;

            // Apply voltage setpoint for PV and slack buses
            // Column 5: VG (voltage setpoint)
            if (this.pvBuses.includes(busIdx) || busIdx === this.slackBus) {
                this.V[busIdx] = gen[5];
            }
        }

        // Build admittance matrix
        this._buildYbus();

        // Reset iteration state
        this.iteration = 0;
        this.converged = false;
        this.errorHistory = [];
    }

    /**
     * Build the bus admittance matrix (Ybus)
     *
     * @private
     * @description Constructs the Ybus matrix from branch data. Handles
     * transmission lines with series impedance and shunt admittance,
     * as well as transformers with off-nominal tap ratios.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * MATHEMATICAL FORMULATION (Admittance Matrix Construction)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * For a transmission line from bus i to bus j with impedance z = R + jX:
     *
     * Step 1: Series Admittance Calculation
     *   y_ij = 1/(R_ij + jX_ij)
     *        = R_ij/(R² + X²) - j·X_ij/(R² + X²)
     *        = g_ij + j·b_ij                                          ... (7)
     *
     *   where:
     *     g_ij = R_ij/(R_ij² + X_ij²)  [Conductance, real part]
     *     b_ij = -X_ij/(R_ij² + X_ij²) [Susceptance, imaginary part]
     *
     * Step 2: Ybus Element Assignment
     *   Self-admittance (diagonal):
     *     Y_ii = Σ(k ∈ neighbors of i) y_ik + y_sh,i                   ... (8)
     *
     *   Mutual admittance (off-diagonal, i ≠ j):
     *     Y_ij = -y_ij                                                  ... (9)
     *
     * Step 3: Transformer Model (with tap ratio τ)
     *   Off-diagonal:   Y_ij = Y_ji = -y/τ
     *   From-bus diag:  Y_ii += y/τ² + jB_c/2
     *   To-bus diag:    Y_jj += y + jB_c/2
     *
     *   where B_c is the total line charging susceptance.
     * ═══════════════════════════════════════════════════════════════════════
     */
    _buildYbus() {
        // Initialize Ybus as zero matrix: Y = [0]_nxn
        for (let i = 0; i < this.nBus; i++) {
            this.Ybus.re[i] = new Array(this.nBus).fill(0);
            this.Ybus.im[i] = new Array(this.nBus).fill(0);
        }

        // Process each branch to build Ybus
        for (const branch of this.branchData) {
            const from = branch[0] - 1;  // F_BUS (1-indexed to 0-indexed)
            const to = branch[1] - 1;    // T_BUS
            let r = branch[2];           // BR_R (resistance, p.u.)
            let x = branch[3];           // BR_X (reactance, p.u.)
            const b = branch[4];         // BR_B (total line charging, p.u.)
            const tap = branch[8] || 1;  // TAP (transformer tap ratio, 0 = line)

            // Handle zero impedance branches (treat as very small impedance)
            if (Math.abs(r) < 1e-8 && Math.abs(x) < 1e-8) continue;
            if (Math.abs(r) < 1e-8) r = 1e-6;
            if (Math.abs(x) < 1e-8) x = 1e-6;

            // Series admittance: y = 1/z = 1/(r + jx)
            // Using complex division: y = (r - jx)/(r² + x²) = g + jb
            const z2 = r * r + x * x;    // |z|² = r² + x²
            const g = r / z2;            // g = Re(y) = r/(r² + x²) [Conductance]
            const bSeries = -x / z2;     // b = Im(y) = -x/(r² + x²) [Susceptance]

            // Handle tap ratio (0 means transmission line, use 1)
            const tapRatio = tap === 0 ? 1 : tap;  // τ (tau)

            // Off-diagonal elements: Y_ij = Y_ji = -y/τ (mutual admittance)
            // Negative sign because current flows out of bus i into the line
            this.Ybus.re[from][to] -= g / tapRatio;
            this.Ybus.im[from][to] -= bSeries / tapRatio;
            this.Ybus.re[to][from] -= g / tapRatio;
            this.Ybus.im[to][from] -= bSeries / tapRatio;

            // Diagonal elements (self-admittance with tap ratio and line charging)
            // From-bus: Y_ii += (y + jB_c/2)/τ² (MATPOWER convention: tap on from side)
            this.Ybus.re[from][from] += g / (tapRatio * tapRatio);
            this.Ybus.im[from][from] += (bSeries + b / 2) / (tapRatio * tapRatio);
            // To-bus: Y_jj += y + jB_c/2 (no tap ratio on receiving end)
            this.Ybus.re[to][to] += g;
            this.Ybus.im[to][to] += bSeries + b / 2;
        }

        // Add shunt admittances from bus data: Y_ii += G_sh + jB_sh
        for (let i = 0; i < this.nBus; i++) {
            // Column 4: GS (shunt conductance, MW at V=1)
            // Column 5: BS (shunt susceptance, MVAr at V=1)
            const Gs = this.busData[i][4] / this.baseMVA;  // Convert to p.u.
            const Bs = this.busData[i][5] / this.baseMVA;  // Convert to p.u.
            this.Ybus.re[i][i] += Gs;
            this.Ybus.im[i][i] += Bs;
        }
    }

    /**
     * Calculate power injections at all buses
     *
     * @private
     * @description Computes complex power injection at each bus using the
     * power balance equations derived from Kirchhoff's current law.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * POWER FLOW EQUATIONS (Polar Form)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Starting from complex power: S_i = V_i · I_i*
     * where I_i = Σ_j Y_ij · V_j (from Ohm's law)
     *
     * Active Power (Real Part of S_i):
     *   P_i = Σ_j |V_i||V_j|[G_ij·cos(θ_i - θ_j) + B_ij·sin(θ_i - θ_j)]  ... (4)
     *
     * Reactive Power (Imaginary Part of S_i):
     *   Q_i = Σ_j |V_i||V_j|[G_ij·sin(θ_i - θ_j) - B_ij·cos(θ_i - θ_j)]  ... (6)
     *
     * where:
     *   |V_i|, |V_j| = Voltage magnitudes at buses i and j (p.u.)
     *   θ_i, θ_j     = Voltage angles at buses i and j (radians)
     *   G_ij, B_ij   = Real and imaginary parts of Y_ij
     *   θ_i - θ_j    = Phase angle difference between buses
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @returns {Object} Object containing P and Q arrays of calculated injections
     * @returns {Array<number>} return.P - Active power injections (p.u.)
     * @returns {Array<number>} return.Q - Reactive power injections (p.u.)
     */
    _calcPowerInjection() {
        const P = new Array(this.nBus).fill(0);
        const Q = new Array(this.nBus).fill(0);

        for (let i = 0; i < this.nBus; i++) {
            for (let j = 0; j < this.nBus; j++) {
                const Gij = this.Ybus.re[i][j];  // G_ij = Re(Y_ij)
                const Bij = this.Ybus.im[i][j];  // B_ij = Im(Y_ij)
                const thetaij = this.delta[i] - this.delta[j];  // θ_ij = θ_i - θ_j

                // Active power: P_i += |V_i||V_j|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]
                P[i] += this.V[i] * this.V[j] * (Gij * Math.cos(thetaij) + Bij * Math.sin(thetaij));

                // Reactive power: Q_i += |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]
                Q[i] += this.V[i] * this.V[j] * (Gij * Math.sin(thetaij) - Bij * Math.cos(thetaij));
            }
        }

        return { P, Q };
    }

    /**
     * Calculate power mismatches at all buses
     *
     * @private
     * @description Computes the difference between specified and calculated power.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * MISMATCH VECTOR (Newton-Raphson Formulation)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * The power flow problem is formulated as finding zeros of:
     *   f(x) = [ΔP; ΔQ] = [P_spec - P_calc(x); Q_spec - Q_calc(x)] = 0  ... (17)
     *
     * where:
     *   ΔP_i = P_spec,i - P_calc,i = (P_gen,i - P_load,i) - P_i(V, θ)
     *   ΔQ_i = Q_spec,i - Q_calc,i = (Q_gen,i - Q_load,i) - Q_i(V, θ)
     *
     * State variable vector:
     *   x = [θ_2, ..., θ_n, |V|_1, ..., |V|_m]^T                        ... (16)
     *
     *   where n = non-slack buses, m = PQ buses
     *
     * Convergence criterion:
     *   max(|ΔP|, |ΔQ|) < ε (tolerance)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @returns {Object} Mismatch data and calculated powers
     * @returns {Array<Object>} return.deltaP - Active power mismatches
     * @returns {Array<Object>} return.deltaQ - Reactive power mismatches
     * @returns {Array<number>} return.Pcalc - Calculated active powers
     * @returns {Array<number>} return.Qcalc - Calculated reactive powers
     */
    _calcMismatch() {
        const { P, Q } = this._calcPowerInjection();
        const deltaP = [];
        const deltaQ = [];

        for (let i = 0; i < this.nBus; i++) {
            if (i === this.slackBus) continue;  // Slack bus has no mismatch equations

            // Get specified powers (p.u.)
            const Pload = this.busData[i][2] / this.baseMVA;  // Column 2: PD
            const Qload = this.busData[i][3] / this.baseMVA;  // Column 3: QD
            const Pspec = this.Pgen[i] - Pload;
            const Qspec = this.Qgen[i] - Qload;

            // Active power mismatch (for all non-slack buses)
            deltaP.push({ bus: i, value: Pspec - P[i] });

            // Reactive power mismatch (only for PQ buses)
            if (this.pqBuses.includes(i)) {
                deltaQ.push({ bus: i, value: Qspec - Q[i] });
            }
        }

        return { deltaP, deltaQ, Pcalc: P, Qcalc: Q };
    }

    /**
     * Perform one Newton-Raphson iteration
     *
     * @private
     * @description Implements the Newton-Raphson method:
     *   1. Calculate power mismatches [ΔP; ΔQ]
     *   2. Build Jacobian matrix J = [J11 J12; J21 J22]
     *   3. Solve J × [Δδ; ΔV] = [ΔP; ΔQ] using LU decomposition
     *   4. Update state: δ_new = δ + Δδ, V_new = V + ΔV
     *
     * @returns {Object} Iteration results
     * @returns {number} return.maxError - Maximum mismatch (p.u.)
     * @returns {Array<Object>} return.deltaP - Active power mismatches
     * @returns {Array<Object>} return.deltaQ - Reactive power mismatches
     */
    _solveNewtonRaphsonStep() {
        const { deltaP, deltaQ } = this._calcMismatch();

        // Form the mismatch vector f = [ΔP; ΔQ]
        const f = [...deltaP.map(d => d.value), ...deltaQ.map(d => d.value)];
        const n = f.length;

        if (n === 0) return { maxError: 0, deltaP, deltaQ };

        // Build Jacobian matrix
        const J = this._buildJacobian(deltaP, deltaQ);

        // Solve linear system: J × dx = f
        const dx = this._solveLU(J, f);

        if (!dx || dx.some(v => !isFinite(v))) {
            return { maxError: Infinity, deltaP, deltaQ };
        }

        // Update state variables
        let idx = 0;

        // Update voltage angles
        for (const dp of deltaP) {
            this.delta[dp.bus] += dx[idx++];
        }

        // Update voltage magnitudes (PQ buses only)
        for (const dq of deltaQ) {
            this.V[dq.bus] += dx[idx++];
            // Enforce voltage limits
            this.V[dq.bus] = Math.max(0.5, Math.min(1.5, this.V[dq.bus]));
        }

        // Calculate maximum errors
        this.maxPError = deltaP.length > 0 ? Math.max(...deltaP.map(d => Math.abs(d.value))) : 0;
        this.maxQError = deltaQ.length > 0 ? Math.max(...deltaQ.map(d => Math.abs(d.value))) : 0;

        return {
            maxError: Math.max(this.maxPError, this.maxQError),
            deltaP,
            deltaQ
        };
    }

    /**
     * Build the Jacobian matrix
     *
     * @private
     * @description Constructs the Jacobian matrix for Newton-Raphson iteration.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * JACOBIAN MATRIX STRUCTURE
     * ═══════════════════════════════════════════════════════════════════════
     *
     * The Jacobian is the matrix of partial derivatives:
     *
     *       ┌                           ┐
     *   J = │ ∂P/∂θ (J_Pθ)   ∂P/∂|V| (J_P|V|) │                         ... (19)
     *       │ ∂Q/∂θ (J_Qθ)   ∂Q/∂|V| (J_Q|V|) │
     *       └                           ┘
     *
     * Matrix dimensions:
     *   - J_Pθ:  (n-1) × (n-1)  [non-slack buses × non-slack buses]
     *   - J_P|V|: (n-1) × m     [non-slack buses × PQ buses]
     *   - J_Qθ:  m × (n-1)      [PQ buses × non-slack buses]
     *   - J_Q|V|: m × m         [PQ buses × PQ buses]
     *
     * Newton-Raphson update equation (with ΔP = P_spec − P_calc):
     *   J · [Δθ; Δ|V|] = [ΔP; ΔQ]                                       ... (18)
     *
     * The Jacobian enables quadratic convergence: ||e^(k+1)|| ∝ ||e^(k)||²
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @param {Array<Object>} deltaP - Active power mismatch data
     * @param {Array<Object>} deltaQ - Reactive power mismatch data
     * @returns {Array<Array<number>>} Jacobian matrix
     */
    _buildJacobian(deltaP, deltaQ) {
        const nP = deltaP.length;
        const nQ = deltaQ.length;
        const n = nP + nQ;

        const J = Array(n).fill(null).map(() => Array(n).fill(0));

        // J11: ∂P/∂δ (upper-left block)
        for (let i = 0; i < nP; i++) {
            const bi = deltaP[i].bus;
            for (let j = 0; j < nP; j++) {
                const bj = deltaP[j].bus;
                J[i][j] = this._dPdDelta(bi, bj);
            }
        }

        // J12: ∂P/∂V (upper-right block)
        for (let i = 0; i < nP; i++) {
            const bi = deltaP[i].bus;
            for (let j = 0; j < nQ; j++) {
                const bj = deltaQ[j].bus;
                J[i][nP + j] = this._dPdV(bi, bj);
            }
        }

        // J21: ∂Q/∂δ (lower-left block)
        for (let i = 0; i < nQ; i++) {
            const bi = deltaQ[i].bus;
            for (let j = 0; j < nP; j++) {
                const bj = deltaP[j].bus;
                J[nP + i][j] = this._dQdDelta(bi, bj);
            }
        }

        // J22: ∂Q/∂V (lower-right block)
        for (let i = 0; i < nQ; i++) {
            const bi = deltaQ[i].bus;
            for (let j = 0; j < nQ; j++) {
                const bj = deltaQ[j].bus;
                J[nP + i][nP + j] = this._dQdV(bi, bj);
            }
        }

        return J;
    }

    /**
     * Calculate ∂P_i/∂θ_j (Jacobian J_Pθ element)
     *
     * @private
     * @description Computes partial derivative of active power w.r.t. voltage angle.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * J_Pθ BLOCK DERIVATION
     * ═══════════════════════════════════════════════════════════════════════
     *
     * From P_i = Σ_j |V_i||V_j|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]:
     *
     * Diagonal (i = j):
     *   ∂P_i/∂θ_i = -Q_i - |V_i|²·B_ii                                  ... (21)
     *
     *   Expanded form:
     *   = Σ(k≠i) |V_i||V_k|[-G_ik·sin(θ_ik) + B_ik·cos(θ_ik)]          ... (20)
     *
     * Off-diagonal (i ≠ j):
     *   ∂P_i/∂θ_j = |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]        ... (22)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @param {number} i - Row bus index
     * @param {number} j - Column bus index
     * @returns {number} Partial derivative value
     */
    _dPdDelta(i, j) {
        if (i === j) {
            // Diagonal: ∂P_i/∂θ_i = Σ(k≠i) |V_i||V_k|[-G_ik·sin(θ_ik) + B_ik·cos(θ_ik)]
            // This equals -Q_i - |V_i|²·B_ii (can be derived from power equation)
            let sum = 0;
            for (let k = 0; k < this.nBus; k++) {
                if (k === i) continue;
                const Gik = this.Ybus.re[i][k];
                const Bik = this.Ybus.im[i][k];
                const thetaik = this.delta[i] - this.delta[k];
                sum += this.V[i] * this.V[k] * (-Gik * Math.sin(thetaik) + Bik * Math.cos(thetaik));
            }
            return sum;
        } else {
            // Off-diagonal: ∂P_i/∂θ_j = |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]
            const Gij = this.Ybus.re[i][j];
            const Bij = this.Ybus.im[i][j];
            const thetaij = this.delta[i] - this.delta[j];
            return this.V[i] * this.V[j] * (Gij * Math.sin(thetaij) - Bij * Math.cos(thetaij));
        }
    }

    /**
     * Calculate ∂P_i/∂|V_j| (Jacobian J_P|V| element)
     *
     * @private
     * @description Computes partial derivative of active power w.r.t. voltage magnitude.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * J_P|V| BLOCK DERIVATION
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Diagonal (i = j):
     *   ∂P_i/∂|V_i| = (P_i + |V_i|²·G_ii) / |V_i|                       ... (24)
     *
     *   Expanded: 2|V_i|·G_ii + Σ(k≠i) |V_k|[G_ik·cos(θ_ik) + B_ik·sin(θ_ik)]
     *
     * Off-diagonal (i ≠ j):
     *   ∂P_i/∂|V_j| = |V_i|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]           ... (25)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @param {number} i - Row bus index
     * @param {number} j - Column bus index
     * @returns {number} Partial derivative value
     */
    _dPdV(i, j) {
        if (i === j) {
            // Diagonal: ∂P_i/∂|V_i| = 2|V_i|·G_ii + Σ(k≠i) |V_k|[G_ik·cos(θ_ik) + B_ik·sin(θ_ik)]
            let sum = 2 * this.V[i] * this.Ybus.re[i][i];
            for (let k = 0; k < this.nBus; k++) {
                if (k === i) continue;
                const Gik = this.Ybus.re[i][k];
                const Bik = this.Ybus.im[i][k];
                const thetaik = this.delta[i] - this.delta[k];
                sum += this.V[k] * (Gik * Math.cos(thetaik) + Bik * Math.sin(thetaik));
            }
            return sum;
        } else {
            // Off-diagonal: ∂P_i/∂|V_j| = |V_i|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]
            const Gij = this.Ybus.re[i][j];
            const Bij = this.Ybus.im[i][j];
            const thetaij = this.delta[i] - this.delta[j];
            return this.V[i] * (Gij * Math.cos(thetaij) + Bij * Math.sin(thetaij));
        }
    }

    /**
     * Calculate ∂Q_i/∂θ_j (Jacobian J_Qθ element)
     *
     * @private
     * @description Computes partial derivative of reactive power w.r.t. voltage angle.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * J_Qθ BLOCK DERIVATION
     * ═══════════════════════════════════════════════════════════════════════
     *
     * From Q_i = Σ_j |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]:
     *
     * Diagonal (i = j):
     *   ∂Q_i/∂θ_i = P_i - |V_i|²·G_ii                                   ... (26)
     *
     *   Expanded: Σ(k≠i) |V_i||V_k|[G_ik·cos(θ_ik) + B_ik·sin(θ_ik)]
     *
     * Off-diagonal (i ≠ j):
     *   ∂Q_i/∂θ_j = -|V_i||V_j|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]       ... (27)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @param {number} i - Row bus index
     * @param {number} j - Column bus index
     * @returns {number} Partial derivative value
     */
    _dQdDelta(i, j) {
        if (i === j) {
            // Diagonal: ∂Q_i/∂θ_i = Σ(k≠i) |V_i||V_k|[G_ik·cos(θ_ik) + B_ik·sin(θ_ik)]
            // This equals P_i - |V_i|²·G_ii
            let sum = 0;
            for (let k = 0; k < this.nBus; k++) {
                if (k === i) continue;
                const Gik = this.Ybus.re[i][k];
                const Bik = this.Ybus.im[i][k];
                const thetaik = this.delta[i] - this.delta[k];
                sum += this.V[i] * this.V[k] * (Gik * Math.cos(thetaik) + Bik * Math.sin(thetaik));
            }
            return sum;
        } else {
            // Off-diagonal: ∂Q_i/∂θ_j = -|V_i||V_j|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]
            const Gij = this.Ybus.re[i][j];
            const Bij = this.Ybus.im[i][j];
            const thetaij = this.delta[i] - this.delta[j];
            return -this.V[i] * this.V[j] * (Gij * Math.cos(thetaij) + Bij * Math.sin(thetaij));
        }
    }

    /**
     * Calculate ∂Q_i/∂|V_j| (Jacobian J_Q|V| element)
     *
     * @private
     * @description Computes partial derivative of reactive power w.r.t. voltage magnitude.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * J_Q|V| BLOCK DERIVATION
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Diagonal (i = j):
     *   ∂Q_i/∂|V_i| = (Q_i - |V_i|²·B_ii) / |V_i|                       ... (28)
     *
     *   Expanded: -2|V_i|·B_ii + Σ(k≠i) |V_k|[G_ik·sin(θ_ik) - B_ik·cos(θ_ik)]
     *
     * Off-diagonal (i ≠ j):
     *   ∂Q_i/∂|V_j| = |V_i|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]           ... (29)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @param {number} i - Row bus index
     * @param {number} j - Column bus index
     * @returns {number} Partial derivative value
     */
    _dQdV(i, j) {
        if (i === j) {
            // Diagonal: ∂Q_i/∂|V_i| = -2|V_i|·B_ii + Σ(k≠i) |V_k|[G_ik·sin(θ_ik) - B_ik·cos(θ_ik)]
            let sum = -2 * this.V[i] * this.Ybus.im[i][i];
            for (let k = 0; k < this.nBus; k++) {
                if (k === i) continue;
                const Gik = this.Ybus.re[i][k];
                const Bik = this.Ybus.im[i][k];
                const thetaik = this.delta[i] - this.delta[k];
                sum += this.V[k] * (Gik * Math.sin(thetaik) - Bik * Math.cos(thetaik));
            }
            return sum;
        } else {
            // Off-diagonal: ∂Q_i/∂|V_j| = |V_i|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]
            const Gij = this.Ybus.re[i][j];
            const Bij = this.Ybus.im[i][j];
            const thetaij = this.delta[i] - this.delta[j];
            return this.V[i] * (Gij * Math.sin(thetaij) - Bij * Math.cos(thetaij));
        }
    }

    /**
     * Calculate the reactive power injection at a single bus
     *
     * @private
     * @description Q_i = Σ_j |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]
     * Used by Gauss-Seidel to estimate Q at PV buses, where Q is a
     * dependent variable rather than a specified quantity.
     *
     * @param {number} i - Bus index (0-based)
     * @returns {number} Reactive power injection (p.u.)
     */
    _calcQInjectionAt(i) {
        let Q = 0;
        for (let j = 0; j < this.nBus; j++) {
            const Gij = this.Ybus.re[i][j];
            const Bij = this.Ybus.im[i][j];
            const thetaij = this.delta[i] - this.delta[j];
            Q += this.V[i] * this.V[j] * (Gij * Math.sin(thetaij) - Bij * Math.cos(thetaij));
        }
        return Q;
    }

    /**
     * Perform one Gauss-Seidel iteration
     *
     * @private
     * @description Implements the Gauss-Seidel method for power flow.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * GAUSS-SEIDEL METHOD
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Basic iterative update formula derived from power balance:
     *
     *   V_i^(k+1) = (1/Y_ii) · [S_i* / V_i*^(k) - Σ(j≠i) Y_ij·V_j^(k+1/k)]
     *
     * Expanded form:
     *   V_i^(k+1) = (1/Y_ii) · [(P_i - jQ_i)/(V_re - jV_im) - Σ Y_ij·V_j]
     *
     * Key characteristics:
     *   - Linear convergence rate: ||e^(k+1)|| ∝ ||e^(k)||
     *   - Uses immediate updates (Gauss-Seidel ordering)
     *   - j < i: uses already updated V_j^(k+1)
     *   - j > i: uses previous iteration V_j^(k)
     *
     * Convergence properties:
     *   - Convergence order: 1 (linear)
     *   - Typical iterations: 15-50
     *   - Computational cost: O(n²) per iteration
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @returns {Object} Iteration results
     * @returns {number} return.maxError - Maximum mismatch (p.u.)
     * @returns {Array<Object>} return.deltaP - Active power mismatches
     * @returns {Array<Object>} return.deltaQ - Reactive power mismatches
     */
    _solveGaussSeidelStep() {
        for (let i = 0; i < this.nBus; i++) {
            if (i === this.slackBus) continue;

            // Get specified powers
            const Pload = this.busData[i][2] / this.baseMVA;
            const Qload = this.busData[i][3] / this.baseMVA;
            const Pspec = this.Pgen[i] - Pload;
            let Qspec;
            if (this.pqBuses.includes(i)) {
                Qspec = this.Qgen[i] - Qload;
            } else {
                // PV bus: Q is not specified. Use the reactive power injection
                // implied by the current voltage estimate:
                //   Q_i = Σ_j |V_i||V_j|[G_ij·sin(θ_ij) - B_ij·cos(θ_ij)]
                // The voltage magnitude itself is held at the setpoint below.
                Qspec = this._calcQInjectionAt(i);
            }

            // Calculate Σ(j≠i) Yij*Vj in rectangular form
            let sumYV_re = 0, sumYV_im = 0;
            for (let j = 0; j < this.nBus; j++) {
                if (j === i) continue;
                const Vj_re = this.V[j] * Math.cos(this.delta[j]);
                const Vj_im = this.V[j] * Math.sin(this.delta[j]);
                sumYV_re += this.Ybus.re[i][j] * Vj_re - this.Ybus.im[i][j] * Vj_im;
                sumYV_im += this.Ybus.re[i][j] * Vj_im + this.Ybus.im[i][j] * Vj_re;
            }

            // Current voltage in rectangular form
            const Vi_re = this.V[i] * Math.cos(this.delta[i]);
            const Vi_im = this.V[i] * Math.sin(this.delta[i]);
            const Vmag2 = this.V[i] * this.V[i];

            // Calculate S*/V* = (P - jQ)/(Vre - jVim) = (P*Vre + Q*Vim + j(P*Vim - Q*Vre))/|V|²
            const SoverVconj_re = (Pspec * Vi_re + Qspec * Vi_im) / Vmag2;
            const SoverVconj_im = (Pspec * Vi_im - Qspec * Vi_re) / Vmag2;

            // Calculate 1/Yii
            const Yii_mag2 = this.Ybus.re[i][i] ** 2 + this.Ybus.im[i][i] ** 2;
            if (Yii_mag2 < 1e-12) continue;

            // New voltage: Vi = (S*/V* - Σ Yij*Vj) / Yii
            const rhs_re = SoverVconj_re - sumYV_re;
            const rhs_im = SoverVconj_im - sumYV_im;

            const newV_re = (rhs_re * this.Ybus.re[i][i] + rhs_im * this.Ybus.im[i][i]) / Yii_mag2;
            const newV_im = (rhs_im * this.Ybus.re[i][i] - rhs_re * this.Ybus.im[i][i]) / Yii_mag2;

            const newVmag = Math.sqrt(newV_re * newV_re + newV_im * newV_im);
            const newVang = Math.atan2(newV_im, newV_re);

            // Apply update with acceleration factor (1.0 = pure Gauss-Seidel;
            // 1.4-1.6 is the classical accelerated range, cf. Stagg & El-Abiad)
            const alpha = this._gsAlpha ?? 1.0;
            this.delta[i] = this.delta[i] + alpha * (newVang - this.delta[i]);

            // Only update magnitude for PQ buses
            if (this.pqBuses.includes(i)) {
                this.V[i] = this.V[i] + alpha * (newVmag - this.V[i]);
                this.V[i] = Math.max(0.5, Math.min(1.5, this.V[i]));
            }
        }

        // Calculate final mismatches
        const { deltaP, deltaQ } = this._calcMismatch();
        this.maxPError = deltaP.length > 0 ? Math.max(...deltaP.map(d => Math.abs(d.value))) : 0;
        this.maxQError = deltaQ.length > 0 ? Math.max(...deltaQ.map(d => Math.abs(d.value))) : 0;

        return {
            maxError: Math.max(this.maxPError, this.maxQError),
            deltaP,
            deltaQ
        };
    }

    /**
     * Perform one Fast Decoupled iteration
     *
     * @private
     * @description Implements the Fast Decoupled XB method.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * FAST DECOUPLED (XB) METHOD
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Based on physical assumptions for transmission systems:
     *   A1: r_ij << x_ij (resistance << reactance)
     *   A2: |θ_i - θ_j| << 1 (small angle differences)
     *   A3: |V_i| ≈ 1.0 (near nominal voltage)
     *   A4: Q_i/|V_i|² << B_ii
     *
     * This allows decoupling of P-θ and Q-|V| subproblems:
     *
     * P-θ Subproblem (Step 1, with ΔP = P_spec − P_calc):               ... (37)
     *   B' · Δθ = ΔP/|V|
     *   Update: θ^(k+1) = θ^(k) + Δθ                                    ... (41)
     *
     * Q-|V| Subproblem (Step 2):                                        ... (38)
     *   B'' · Δ|V| = ΔQ/|V|
     *   Update: |V|^(k+1) = |V|^(k) + Δ|V|                              ... (44)
     *
     * B' and B'' matrices are constant (XB scheme, Stott & Alsac 1974):
     *   B'  : built from series reactance only (r, shunts, taps ignored)
     *         B'_ij = -1/X_ij, B'_ii = Σ(1/X_ik)                        ... (33-34)
     *   B'' : -Im(Ybus) restricted to PQ buses (shunts/charging included) (35-36)
     *
     * Convergence: 1.6-1.8 order (quasi-quadratic)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @returns {Object} Iteration results
     * @returns {number} return.maxError - Maximum mismatch (p.u.)
     * @returns {Array<Object>} return.deltaP - Active power mismatches
     * @returns {Array<Object>} return.deltaQ - Reactive power mismatches
     */
    _solveFastDecoupledStep() {
        const { deltaP, deltaQ } = this._calcMismatch();

        // P-δ subproblem: B' × Δδ = ΔP/V
        if (deltaP.length > 0) {
            const Bp = this._buildBPrime(deltaP.map(d => d.bus));
            const fp = deltaP.map(d => d.value / this.V[d.bus]);
            const dDelta = this._solveLU(Bp, fp);

            if (dDelta && dDelta.every(v => isFinite(v))) {
                for (let i = 0; i < deltaP.length; i++) {
                    this.delta[deltaP[i].bus] += dDelta[i];
                }
            }
        }

        // Q-V subproblem: B'' × ΔV = ΔQ/V
        if (deltaQ.length > 0) {
            const Bpp = this._buildBMatrix(deltaQ.map(d => d.bus));
            const fq = deltaQ.map(d => d.value / this.V[d.bus]);
            const dV = this._solveLU(Bpp, fq);

            if (dV && dV.every(v => isFinite(v))) {
                for (let i = 0; i < deltaQ.length; i++) {
                    this.V[deltaQ[i].bus] += dV[i];
                    this.V[deltaQ[i].bus] = Math.max(0.5, Math.min(1.5, this.V[deltaQ[i].bus]));
                }
            }
        }

        // Recalculate mismatches after updates
        const newMismatch = this._calcMismatch();
        this.maxPError = newMismatch.deltaP.length > 0 ? Math.max(...newMismatch.deltaP.map(d => Math.abs(d.value))) : 0;
        this.maxQError = newMismatch.deltaQ.length > 0 ? Math.max(...newMismatch.deltaQ.map(d => Math.abs(d.value))) : 0;

        return {
            maxError: Math.max(this.maxPError, this.maxQError),
            deltaP: newMismatch.deltaP,
            deltaQ: newMismatch.deltaQ
        };
    }

    /**
     * Build the B' matrix (also used as the DC power flow B matrix)
     *
     * @private
     * @description Constructs the susceptance matrix from series reactance
     * only, ignoring resistance, line charging, and bus shunts:
     *   B_ij = -1/X_ij (i ≠ j),  B_ii = Σ_k 1/X_ik
     * With useTap = true, each branch susceptance becomes 1/(X·τ)
     * (MATPOWER makeBdc convention) for exact DC power flow results.
     *
     * @param {Array<number>} buses - Bus indices (0-based) to include (non-slack)
     * @param {boolean} [useTap=false] - Divide branch susceptance by tap ratio
     * @returns {Array<Array<number>>} Reduced B matrix
     */
    _buildBPrime(buses, useTap = false) {
        const idx = new Map(buses.map((b, k) => [b, k]));
        const n = buses.length;
        const B = Array(n).fill(null).map(() => Array(n).fill(0));

        for (const branch of this.branchData) {
            const from = branch[0] - 1;
            const to = branch[1] - 1;
            let x = branch[3];
            if (Math.abs(x) < 1e-8) x = 1e-6;

            const tap = branch[8] || 1;
            const tapRatio = (useTap && tap !== 0) ? tap : 1;
            const bBranch = 1 / (x * tapRatio);

            const fi = idx.get(from);
            const ti = idx.get(to);
            if (fi !== undefined) B[fi][fi] += bBranch;
            if (ti !== undefined) B[ti][ti] += bBranch;
            if (fi !== undefined && ti !== undefined) {
                B[fi][ti] -= bBranch;
                B[ti][fi] -= bBranch;
            }
        }

        return B;
    }

    /**
     * Build the B'' matrix for the Fast Decoupled Q-|V| subproblem
     *
     * @private
     * @description B'' = -Im(Ybus) restricted to the given (PQ) buses.
     * Unlike B', this includes line charging and bus shunt susceptances,
     * which directly affect the reactive power balance.
     *
     * @param {Array<number>} buses - List of bus indices to include
     * @returns {Array<Array<number>>} B'' matrix
     */
    _buildBMatrix(buses) {
        const n = buses.length;
        const B = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                B[i][j] = -this.Ybus.im[buses[i]][buses[j]];
            }
        }

        return B;
    }

    /**
     * Solve DC Power Flow
     *
     * @private
     * @description Solves the linearized DC power flow equations.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * DC POWER FLOW (Linear Approximation)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Assumptions (from AC power flow equations):
     *   1. |V_i| = 1.0 p.u. for all buses
     *   2. r_ij << x_ij (negligible resistance, G_ij ≈ 0)
     *   3. θ_i - θ_j << 1 rad (small angle differences)
     *      → sin(θ_ij) ≈ θ_ij
     *      → cos(θ_ij) ≈ 1
     *
     * Linearized Power Equation:
     *   From: P_i = Σ_j |V_i||V_j|[G_ij·cos(θ_ij) + B_ij·sin(θ_ij)]
     *   To:   P_i ≈ Σ_j B_ij·(θ_i - θ_j) = Σ_j B_ij·θ_i - Σ_j B_ij·θ_j
     *
     * Matrix Form:
     *   P = B·θ  (linear system, single solution)
     *
     * Susceptance Matrix:
     *   B_ii = Σ(k≠i) (1/X_ik)  [diagonal]
     *   B_ij = -1/X_ij          [off-diagonal, i ≠ j]
     *
     * Branch Flow:
     *   P_ij = (θ_i - θ_j)/X_ij
     *
     * Properties:
     *   - Non-iterative (direct solution)
     *   - No reactive power or voltage magnitude info
     *   - Suitable for: economic dispatch, contingency screening
     * ═══════════════════════════════════════════════════════════════════════
     *
     * @returns {Object} DC power flow results
     * @returns {boolean} return.converged - Always true for DC
     * @returns {number} return.iterations - Always 1 for DC
     * @returns {Array<number>} return.angles - Voltage angles (radians)
     */
    _solveDC() {
        // Build reduced B matrix (excluding slack bus)
        const buses = [];
        for (let i = 0; i < this.nBus; i++) {
            if (i !== this.slackBus) buses.push(i);
        }

        const n = buses.length;
        const P = new Array(n).fill(0);

        // B matrix from series reactance only (1/(X·τ) per branch):
        // shunts and line charging must NOT appear in the DC formulation
        const B = this._buildBPrime(buses, true);

        // Populate P injection vector
        for (let i = 0; i < n; i++) {
            const bi = buses[i];
            const Pload = this.busData[bi][2] / this.baseMVA;
            P[i] = this.Pgen[bi] - Pload;
        }

        // Solve B × δ = P
        const delta = this._solveLU(B, P);

        if (delta && delta.every(v => isFinite(v))) {
            // Update voltage angles
            for (let i = 0; i < n; i++) {
                this.delta[buses[i]] = delta[i];
            }
            // Slack bus angle remains 0
            this.delta[this.slackBus] = 0;

            // Set all voltage magnitudes to 1.0 (DC assumption)
            for (let i = 0; i < this.nBus; i++) {
                this.V[i] = 1.0;
            }

            this.converged = true;
            this.iteration = 1;
        }

        return {
            converged: true,
            iterations: 1,
            angles: [...this.delta]
        };
    }

    /**
     * Solve linear system using LU decomposition with partial pivoting
     *
     * @private
     * @description Solves Ax = b using LU decomposition:
     *   1. Factor A = LU with partial pivoting
     *   2. Solve Ly = Pb (forward substitution)
     *   3. Solve Ux = y (backward substitution)
     *
     * @param {Array<Array<number>>} A - Coefficient matrix
     * @param {Array<number>} b - Right-hand side vector
     * @returns {Array<number>|null} Solution vector, or null if singular
     */
    _solveLU(A, b) {
        const n = A.length;
        if (n === 0) return [];

        try {
            // Create working copy for LU factorization
            const LU = A.map(row => [...row]);
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
                if (Math.abs(LU[k][k]) < 1e-12) {
                    LU[k][k] = 1e-10;
                }

                // Elimination step
                for (let i = k + 1; i < n; i++) {
                    LU[i][k] /= LU[k][k];
                    for (let j = k + 1; j < n; j++) {
                        LU[i][j] -= LU[i][k] * LU[k][j];
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

            return x;
        } catch (e) {
            return new Array(n).fill(0);
        }
    }

    /**
     * Run one iteration of the specified algorithm
     *
     * @param {string} [algorithm='nr'] - Algorithm type: 'nr', 'fdxb', 'gs', 'dc'
     * @returns {Object} Iteration results
     * @returns {number} return.maxError - Maximum mismatch (p.u.)
     * @returns {Array<Object>} return.deltaP - Active power mismatches
     * @returns {Array<Object>} return.deltaQ - Reactive power mismatches
     */
    runIteration(algorithm = 'nr') {
        this.iteration++;

        let result;
        switch (algorithm) {
            case 'nr':
                result = this._solveNewtonRaphsonStep();
                break;
            case 'fdxb':
                result = this._solveFastDecoupledStep();
                break;
            case 'gs':
                result = this._solveGaussSeidelStep();
                break;
            case 'dc':
                this._solveDC();
                result = { maxError: 0, deltaP: [], deltaQ: [] };
                break;
            default:
                result = this._solveNewtonRaphsonStep();
        }

        // Record error history
        this.errorHistory.push({
            iteration: this.iteration,
            maxP: this.maxPError,
            maxQ: this.maxQError,
            max: result.maxError
        });

        return result;
    }

    /**
     * Solve the power flow problem to convergence
     *
     * @description Main entry point for power flow solution. Iterates until
     * convergence or maximum iterations reached.
     *
     * @param {Object} [options={}] - Solver options
     * @param {string} [options.algorithm='nr'] - Algorithm: 'nr', 'fdxb', 'gs', 'dc'
     * @param {number} [options.tolerance=1e-6] - Convergence tolerance (p.u.)
     * @param {number} [options.maxIterations=100] - Maximum iterations
     * @returns {Object} Solution results
     * @returns {boolean} return.converged - Whether solution converged
     * @returns {number} return.iterations - Number of iterations performed
     * @returns {number} return.maxError - Final maximum mismatch
     * @returns {Array<Object>} return.busResults - Per-bus results
     * @returns {Array<Object>} return.errorHistory - Convergence history
     */
    solve(options = {}) {
        const {
            algorithm = 'nr',
            tolerance = 1e-6,
            maxIterations = 100,
            acceleration = 1.0
        } = options;

        // Acceleration factor for Gauss-Seidel (ignored by other methods)
        this._gsAlpha = acceleration;

        // Handle DC power flow separately (non-iterative)
        if (algorithm === 'dc') {
            this._solveDC();
            return {
                converged: true,
                iterations: 1,
                maxError: 0,
                busResults: this.getBusResults(),
                errorHistory: this.errorHistory
            };
        }

        // Iterative solution for AC power flow
        while (this.iteration < maxIterations) {
            const result = this.runIteration(algorithm);

            if (result.maxError < tolerance) {
                this.converged = true;
                break;
            }

            if (!isFinite(result.maxError)) {
                break;  // Diverged
            }
        }

        return {
            converged: this.converged,
            iterations: this.iteration,
            maxError: Math.max(this.maxPError, this.maxQError),
            busResults: this.getBusResults(),
            errorHistory: this.errorHistory
        };
    }

    /**
     * Solve using Newton-Raphson method
     *
     * @description Convenience method for Newton-Raphson power flow.
     * Newton-Raphson has quadratic convergence and is the most common
     * method for power flow analysis.
     *
     * @param {Object} [options={}] - Solver options
     * @param {number} [options.tolerance=1e-6] - Convergence tolerance
     * @param {number} [options.maxIterations=100] - Maximum iterations
     * @returns {Object} Solution results
     */
    solveNewtonRaphson(options = {}) {
        return this.solve({ ...options, algorithm: 'nr' });
    }

    /**
     * Solve using Fast Decoupled XB method
     *
     * @description Convenience method for Fast Decoupled power flow.
     * Faster per iteration than Newton-Raphson but may need more iterations.
     * Best for large systems with weak P-Q coupling.
     *
     * @param {Object} [options={}] - Solver options
     * @param {number} [options.tolerance=1e-6] - Convergence tolerance
     * @param {number} [options.maxIterations=100] - Maximum iterations
     * @returns {Object} Solution results
     */
    solveFastDecoupled(options = {}) {
        return this.solve({ ...options, algorithm: 'fdxb' });
    }

    /**
     * Solve using Gauss-Seidel method
     *
     * @description Convenience method for Gauss-Seidel power flow.
     * Simple implementation with linear convergence. Good for educational
     * purposes but slower than Newton-Raphson for most systems.
     *
     * @param {Object} [options={}] - Solver options
     * @param {number} [options.tolerance=1e-6] - Convergence tolerance
     * @param {number} [options.maxIterations=100] - Maximum iterations
     * @returns {Object} Solution results
     */
    solveGaussSeidel(options = {}) {
        return this.solve({ ...options, algorithm: 'gs' });
    }

    /**
     * Solve using DC Power Flow
     *
     * @description Convenience method for DC power flow.
     * Non-iterative linear approximation. Assumes:
     *   - All voltage magnitudes are 1.0 p.u.
     *   - Line resistance is negligible
     *   - Angle differences are small
     *
     * Good for quick estimates and contingency analysis.
     *
     * @returns {Object} Solution results
     */
    solveDC() {
        return this.solve({ algorithm: 'dc' });
    }

    /**
     * Get detailed bus results
     *
     * @description Returns voltage, power, and mismatch data for all buses
     * in a format suitable for display in tables or export.
     *
     * @returns {Array<Object>} Array of bus result objects
     * @returns {number} return[].bus - Bus number
     * @returns {string} return[].type - Bus type ('Slack', 'PV', or 'PQ')
     * @returns {number} return[].V - Voltage magnitude (p.u.)
     * @returns {number} return[].delta - Voltage angle (degrees)
     * @returns {number} return[].Pgen - Generated active power (MW)
     * @returns {number} return[].Qgen - Generated reactive power (MVAr)
     * @returns {number} return[].Pload - Load active power (MW)
     * @returns {number} return[].Qload - Load reactive power (MVAr)
     * @returns {number} return[].deltaP - Active power mismatch (p.u.)
     * @returns {number} return[].deltaQ - Reactive power mismatch (p.u.)
     */
    getBusResults() {
        const { P, Q } = this._calcPowerInjection();

        return this.busData.map((bus, i) => {
            const Pload = bus[2] / this.baseMVA;
            const Qload = bus[3] / this.baseMVA;
            const Pspec = this.Pgen[i] - Pload;
            const Qspec = this.Qgen[i] - Qload;

            return {
                bus: bus[0],
                type: bus[1] === BUS_TYPE.SLACK ? 'Slack' : (bus[1] === BUS_TYPE.PV ? 'PV' : 'PQ'),
                V: this.V[i],
                delta: this.delta[i] * 180 / Math.PI,  // Convert to degrees
                Pgen: this.Pgen[i] * this.baseMVA,
                Qgen: this.Qgen[i] * this.baseMVA,
                Pload: bus[2],
                Qload: bus[3],
                deltaP: i === this.slackBus ? 0 : Pspec - P[i],
                deltaQ: (i === this.slackBus || this.pvBuses.includes(i)) ? 0 : Qspec - Q[i]
            };
        });
    }

    /**
     * Get branch flow results
     *
     * @description Calculates power flow on all branches based on
     * current voltage solution.
     *
     * @returns {Array<Object>} Array of branch flow objects
     * @returns {number} return[].from - From bus number
     * @returns {number} return[].to - To bus number
     * @returns {number} return[].Pij - Active power from i to j (MW)
     * @returns {number} return[].Qij - Reactive power from i to j (MVAr)
     * @returns {number} return[].Pji - Active power from j to i (MW)
     * @returns {number} return[].Qji - Reactive power from j to i (MVAr)
     * @returns {number} return[].Ploss - Active power loss (MW)
     * @returns {number} return[].Qloss - Reactive power loss (MVAr)
     */
    getBranchFlows() {
        const flows = [];

        for (const branch of this.branchData) {
            const from = branch[0] - 1;
            const to = branch[1] - 1;
            let r = branch[2];
            let x = branch[3];
            const b = branch[4];
            const tap = branch[8] || 1;

            // Handle zero impedance
            if (Math.abs(r) < 1e-8) r = 1e-6;
            if (Math.abs(x) < 1e-8) x = 1e-6;

            // Series admittance
            const z2 = r * r + x * x;
            const g = r / z2;
            const bSeries = -x / z2;
            const tapRatio = tap === 0 ? 1 : tap;

            // Get voltages in rectangular form
            const Vi = this.V[from];
            const Vj = this.V[to];
            const di = this.delta[from];
            const dj = this.delta[to];

            // Calculate complex power flow Sij = Vi * conj(Iij)
            const thetaij = di - dj;

            // Power from i to j
            const Pij = Vi * Vi * g / (tapRatio * tapRatio) -
                       Vi * Vj * (g * Math.cos(thetaij) + bSeries * Math.sin(thetaij)) / tapRatio;
            const Qij = -Vi * Vi * (bSeries + b / 2) / (tapRatio * tapRatio) -
                        Vi * Vj * (g * Math.sin(thetaij) - bSeries * Math.cos(thetaij)) / tapRatio;

            // Power from j to i
            const Pji = Vj * Vj * g -
                       Vi * Vj * (g * Math.cos(thetaij) - bSeries * Math.sin(thetaij)) / tapRatio;
            const Qji = -Vj * Vj * (bSeries + b / 2) +
                        Vi * Vj * (g * Math.sin(thetaij) + bSeries * Math.cos(thetaij)) / tapRatio;

            flows.push({
                from: branch[0],
                to: branch[1],
                Pij: Pij * this.baseMVA,
                Qij: Qij * this.baseMVA,
                Pji: Pji * this.baseMVA,
                Qji: Qji * this.baseMVA,
                Ploss: (Pij + Pji) * this.baseMVA,
                Qloss: (Qij + Qji) * this.baseMVA
            });
        }

        return flows;
    }

    /**
     * Reset the engine to initial state
     *
     * @description Resets all state variables to initial values from case data.
     * Useful for re-running with different algorithm or options.
     */
    reset() {
        this._initialize();
    }

    /**
     * Get the admittance matrix
     *
     * @returns {Object} Ybus matrix with real and imaginary parts
     * @returns {Array<Array<number>>} return.re - Real part (conductance)
     * @returns {Array<Array<number>>} return.im - Imaginary part (susceptance)
     */
    getYbus() {
        return {
            re: this.Ybus.re.map(row => [...row]),
            im: this.Ybus.im.map(row => [...row])
        };
    }

    /**
     * Get current voltage solution
     *
     * @returns {Object} Voltage arrays
     * @returns {Array<number>} return.magnitude - Voltage magnitudes (p.u.)
     * @returns {Array<number>} return.angle - Voltage angles (radians)
     * @returns {Array<number>} return.angleDeg - Voltage angles (degrees)
     */
    getVoltages() {
        return {
            magnitude: [...this.V],
            angle: [...this.delta],
            angleDeg: this.delta.map(d => d * 180 / Math.PI)
        };
    }

    /**
     * Get convergence history
     *
     * @returns {Array<Object>} Array of error history entries
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }
}

// ============================================================
// Export for Browser and Module Systems
// ============================================================

// For browser global scope
if (typeof window !== 'undefined') {
    window.PowerFlowEngine = PowerFlowEngine;
    window.BUS_TYPE = BUS_TYPE;
    window.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
}

// For ES6 module systems (wrapped to prevent errors in non-module context)
// export { PowerFlowEngine, BUS_TYPE, DEFAULT_OPTIONS };
