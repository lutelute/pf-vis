/**
 * IEEE Standard Test Case Data Module
 *
 * @fileoverview This module contains IEEE standard power system test cases
 * in MATPOWER v2 format. All data is per-unit with consistent column ordering.
 *
 * @description Provides standardized IEEE test cases for power flow analysis
 * including 2-bus, 5-bus, 9-bus (WSCC), 14-bus, and 30-bus systems.
 *
 * @see https://matpower.org - MATPOWER User's Manual
 * @see R. D. Zimmerman, C. E. Murillo-Sanchez (2020) MATPOWER 7.1
 *
 * @author Power Flow Visualization Project
 * @license MIT
 */

// ============================================================
// MATPOWER v2 Format Column Definitions
// ============================================================
//
// Bus Data Columns:
// [0] BUS_I     - Bus number (positive integer)
// [1] BUS_TYPE  - Bus type (1 = PQ, 2 = PV, 3 = Slack/Reference)
// [2] PD        - Real power demand (MW)
// [3] QD        - Reactive power demand (MVAr)
// [4] GS        - Shunt conductance (MW demanded at V = 1.0 p.u.)
// [5] BS        - Shunt susceptance (MVAr injected at V = 1.0 p.u.)
// [6] BUS_AREA  - Area number (positive integer)
// [7] VM        - Voltage magnitude (p.u.)
// [8] VA        - Voltage angle (degrees)
// [9] BASE_KV   - Base voltage (kV)
// [10] ZONE     - Loss zone (positive integer)
// [11] VMAX     - Maximum voltage magnitude (p.u.)
// [12] VMIN     - Minimum voltage magnitude (p.u.)
//
// Generator Data Columns:
// [0] GEN_BUS   - Bus number
// [1] PG        - Real power output (MW)
// [2] QG        - Reactive power output (MVAr)
// [3] QMAX      - Maximum reactive power output (MVAr)
// [4] QMIN      - Minimum reactive power output (MVAr)
// [5] VG        - Voltage magnitude setpoint (p.u.)
// [6] MBASE     - Total MVA base of machine (default: baseMVA)
// [7] GEN_STATUS - Machine status (> 0 = in service)
// [8] PMAX      - Maximum real power output (MW)
// [9] PMIN      - Minimum real power output (MW)
//
// Branch Data Columns:
// [0] F_BUS     - From bus number
// [1] T_BUS     - To bus number
// [2] BR_R      - Resistance (p.u.)
// [3] BR_X      - Reactance (p.u.)
// [4] BR_B      - Total line charging susceptance (p.u.)
// [5] RATE_A    - MVA rating A (long term rating)
// [6] RATE_B    - MVA rating B (short term rating)
// [7] RATE_C    - MVA rating C (emergency rating)
// [8] TAP       - Transformer off-nominal turns ratio (0 = transmission line)
// [9] SHIFT     - Transformer phase shift angle (degrees)
// [10] BR_STATUS - Branch status (1 = in service, 0 = out of service)
// ============================================================

/**
 * IEEE 2-Bus Test System
 *
 * @description Simple 2-bus system for educational purposes and algorithm validation.
 * Contains one slack bus and one load bus connected by a single transmission line.
 * This is the simplest possible power system for testing power flow algorithms.
 *
 * @type {Object}
 * @property {string} name - System name
 * @property {number} baseMVA - Base power (100 MVA)
 * @property {Array<Array<number>>} bus - Bus data in MATPOWER format
 * @property {Array<Array<number>>} gen - Generator data in MATPOWER format
 * @property {Array<Array<number>>} branch - Branch data in MATPOWER format
 */
const IEEE_2_BUS = {
    name: 'IEEE 2-Bus Simple System',
    baseMVA: 100,
    // Bus data: [BUS_I, TYPE, PD, QD, GS, BS, AREA, VM, VA, BASE_KV, ZONE, VMAX, VMIN]
    // Type: 1=PQ, 2=PV, 3=Slack
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9],      // Slack bus - generator bus
        [2, 1, 100, 35, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9]    // PQ bus - load bus
    ],
    // Generator data: [GEN_BUS, PG, QG, QMAX, QMIN, VG, MBASE, STATUS, PMAX, PMIN]
    gen: [
        [1, 0, 0, 150, -150, 1.0, 100, 1, 200, 0]              // Slack generator
    ],
    // Branch data: [F_BUS, T_BUS, R, X, B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
    branch: [
        [1, 2, 0.01, 0.1, 0.02, 250, 250, 250, 0, 0, 1]        // Transmission line
    ]
};

/**
 * IEEE 5-Bus Test System
 *
 * @description 5-bus test system for power flow analysis demonstrations.
 * Features two generators, five load buses, and seven transmission lines.
 * Suitable for testing basic power flow algorithms and network visualizations.
 *
 * @type {Object}
 * @property {string} name - System name
 * @property {number} baseMVA - Base power (100 MVA)
 * @property {Array<Array<number>>} bus - Bus data in MATPOWER format
 * @property {Array<Array<number>>} gen - Generator data in MATPOWER format
 * @property {Array<Array<number>>} branch - Branch data in MATPOWER format
 */
const IEEE_5_BUS = {
    name: 'IEEE 5-Bus Test System',
    baseMVA: 100,
    // Bus data: [BUS_I, TYPE, PD, QD, GS, BS, AREA, VM, VA, BASE_KV, ZONE, VMAX, VMIN]
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.06, 0, 230, 1, 1.1, 0.9],     // Slack bus
        [2, 2, 20, 10, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9],    // PV bus
        [3, 1, 45, 15, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9],    // PQ bus
        [4, 1, 40, 5, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9],     // PQ bus
        [5, 1, 60, 10, 0, 0, 1, 1.0, 0, 230, 1, 1.1, 0.9]     // PQ bus
    ],
    // Generator data: [GEN_BUS, PG, QG, QMAX, QMIN, VG, MBASE, STATUS, PMAX, PMIN]
    gen: [
        [1, 0, 0, 200, -200, 1.06, 100, 1, 250, 10],          // Slack generator
        [2, 40, 0, 100, -100, 1.045, 100, 1, 150, 10]         // PV generator
    ],
    // Branch data: [F_BUS, T_BUS, R, X, B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
    branch: [
        [1, 2, 0.02, 0.06, 0.03, 130, 130, 130, 0, 0, 1],
        [1, 3, 0.08, 0.24, 0.025, 130, 130, 130, 0, 0, 1],
        [2, 3, 0.06, 0.18, 0.02, 65, 65, 65, 0, 0, 1],
        [2, 4, 0.06, 0.18, 0.02, 90, 90, 90, 0, 0, 1],
        [2, 5, 0.04, 0.12, 0.015, 70, 70, 70, 0, 0, 1],
        [3, 4, 0.01, 0.03, 0.01, 130, 130, 130, 0, 0, 1],
        [4, 5, 0.08, 0.24, 0.025, 90, 90, 90, 0, 0, 1]
    ]
};

/**
 * IEEE 9-Bus Test System (WSCC 3-Machine 9-Bus)
 *
 * @description The Western System Coordinating Council (WSCC) 9-bus test system.
 * This is a well-known benchmark for power system analysis featuring three generators,
 * three loads, and nine buses. Originally developed for transient stability studies.
 *
 * @see Anderson, P.M. and Fouad, A.A., "Power System Control and Stability"
 *
 * @type {Object}
 * @property {string} name - System name
 * @property {number} baseMVA - Base power (100 MVA)
 * @property {Array<Array<number>>} bus - Bus data in MATPOWER format
 * @property {Array<Array<number>>} gen - Generator data in MATPOWER format
 * @property {Array<Array<number>>} branch - Branch data in MATPOWER format
 */
const IEEE_9_BUS = {
    name: 'IEEE 9-Bus WSCC System',
    baseMVA: 100,
    // Bus data: [BUS_I, TYPE, PD, QD, GS, BS, AREA, VM, VA, BASE_KV, ZONE, VMAX, VMIN]
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.04, 0, 16.5, 1, 1.1, 0.9],    // Slack - Generator 1
        [2, 2, 0, 0, 0, 0, 1, 1.025, 0, 18, 1, 1.1, 0.9],     // PV - Generator 2
        [3, 2, 0, 0, 0, 0, 1, 1.025, 0, 13.8, 1, 1.1, 0.9],   // PV - Generator 3
        [4, 1, 0, 0, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9],        // PQ - G1 HV bus
        [5, 1, 90, 30, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9],      // PQ - Load B (90 MW)
        [6, 1, 0, 0, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9],        // PQ - G3 HV bus
        [7, 1, 100, 35, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9],     // PQ - Load C (100 MW)
        [8, 1, 0, 0, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9],        // PQ - G2 HV bus
        [9, 1, 125, 50, 0, 0, 1, 1, 0, 345, 1, 1.1, 0.9]      // PQ - Load A (125 MW)
    ],
    // Generator data: [GEN_BUS, PG, QG, QMAX, QMIN, VG, MBASE, STATUS, PMAX, PMIN]
    gen: [
        [1, 71.64, 27.05, 300, -300, 1.04, 100, 1, 250, 10],  // Generator 1 (Slack)
        [2, 163, 6.65, 300, -300, 1.025, 100, 1, 300, 10],    // Generator 2
        [3, 85, -10.86, 300, -300, 1.025, 100, 1, 270, 10]    // Generator 3
    ],
    // Branch data: [F_BUS, T_BUS, R, X, B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
    branch: [
        [1, 4, 0, 0.0576, 0, 250, 250, 250, 0, 0, 1],         // Transformer G1-Bus4
        [4, 5, 0.017, 0.092, 0.158, 250, 250, 250, 0, 0, 1],
        [5, 6, 0.039, 0.17, 0.358, 150, 150, 150, 0, 0, 1],
        [3, 6, 0, 0.0586, 0, 300, 300, 300, 0, 0, 1],         // Transformer G3-Bus6
        [6, 7, 0.0119, 0.1008, 0.209, 150, 150, 150, 0, 0, 1],
        [7, 8, 0.0085, 0.072, 0.149, 250, 250, 250, 0, 0, 1],
        [8, 2, 0, 0.0625, 0, 250, 250, 250, 0, 0, 1],         // Transformer G2-Bus8
        [8, 9, 0.032, 0.161, 0.306, 250, 250, 250, 0, 0, 1],
        [9, 4, 0.01, 0.085, 0.176, 250, 250, 250, 0, 0, 1]
    ]
};

/**
 * IEEE 14-Bus Test System
 *
 * @description The IEEE 14-bus test system represents a portion of the American Electric
 * Power System as of February 1962. It contains 14 buses, 5 generators, 11 loads,
 * and 20 branches (including transformers). This is one of the most widely used
 * benchmark systems for power flow algorithm validation.
 *
 * @see IEEE Power Systems Test Case Archive
 * @see https://icseg.iti.illinois.edu/ieee-14-bus-system/
 *
 * @type {Object}
 * @property {string} name - System name
 * @property {number} baseMVA - Base power (100 MVA)
 * @property {Array<Array<number>>} bus - Bus data in MATPOWER format
 * @property {Array<Array<number>>} gen - Generator data in MATPOWER format
 * @property {Array<Array<number>>} branch - Branch data in MATPOWER format
 */
const IEEE_14_BUS = {
    name: 'IEEE 14-Bus Test System',
    baseMVA: 100,
    // Bus data: [BUS_I, TYPE, PD, QD, GS, BS, AREA, VM, VA, BASE_KV, ZONE, VMAX, VMIN]
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.06, 0, 0, 1, 1.06, 0.94],     // Slack bus
        [2, 2, 21.7, 12.7, 0, 0, 1, 1.045, 0, 0, 1, 1.06, 0.94],
        [3, 2, 94.2, 19, 0, 0, 1, 1.01, 0, 0, 1, 1.06, 0.94],
        [4, 1, 47.8, -3.9, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [5, 1, 7.6, 1.6, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [6, 2, 11.2, 7.5, 0, 0, 1, 1.07, 0, 0, 1, 1.06, 0.94],
        [7, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [8, 2, 0, 0, 0, 0, 1, 1.09, 0, 0, 1, 1.06, 0.94],
        [9, 1, 29.5, 16.6, 0, 19, 1, 1, 0, 0, 1, 1.06, 0.94], // Shunt capacitor
        [10, 1, 9, 5.8, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [11, 1, 3.5, 1.8, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [12, 1, 6.1, 1.6, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [13, 1, 13.5, 5.8, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94],
        [14, 1, 14.9, 5, 0, 0, 1, 1, 0, 0, 1, 1.06, 0.94]
    ],
    // Generator data: [GEN_BUS, PG, QG, QMAX, QMIN, VG, MBASE, STATUS, PMAX, PMIN]
    gen: [
        [1, 232.4, -16.9, 10, 0, 1.06, 100, 1, 332.4, 0],     // Slack generator
        [2, 40, 42.4, 50, -40, 1.045, 100, 1, 140, 0],
        [3, 0, 23.4, 40, 0, 1.01, 100, 1, 100, 0],            // Synchronous condenser
        [6, 0, 12.2, 24, -6, 1.07, 100, 1, 100, 0],           // Synchronous condenser
        [8, 0, 17.4, 24, -6, 1.09, 100, 1, 100, 0]            // Synchronous condenser
    ],
    // Branch data: [F_BUS, T_BUS, R, X, B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
    branch: [
        [1, 2, 0.01938, 0.05917, 0.0528, 472, 472, 472, 0, 0, 1],
        [1, 5, 0.05403, 0.22304, 0.0492, 128, 128, 128, 0, 0, 1],
        [2, 3, 0.04699, 0.19797, 0.0438, 145, 145, 145, 0, 0, 1],
        [2, 4, 0.05811, 0.17632, 0.034, 132, 132, 132, 0, 0, 1],
        [2, 5, 0.05695, 0.17388, 0.0346, 136, 136, 136, 0, 0, 1],
        [3, 4, 0.06701, 0.17103, 0.0128, 65, 65, 65, 0, 0, 1],
        [4, 5, 0.01335, 0.04211, 0, 0, 0, 0, 0, 0, 1],
        [4, 7, 0, 0.20912, 0, 0, 0, 0, 0.978, 0, 1],          // Transformer
        [4, 9, 0, 0.55618, 0, 0, 0, 0, 0.969, 0, 1],          // Transformer
        [5, 6, 0, 0.25202, 0, 0, 0, 0, 0.932, 0, 1],          // Transformer
        [6, 11, 0.09498, 0.1989, 0, 0, 0, 0, 0, 0, 1],
        [6, 12, 0.12291, 0.25581, 0, 0, 0, 0, 0, 0, 1],
        [6, 13, 0.06615, 0.13027, 0, 0, 0, 0, 0, 0, 1],
        [7, 8, 0, 0.17615, 0, 0, 0, 0, 0, 0, 1],
        [7, 9, 0, 0.11001, 0, 0, 0, 0, 0, 0, 1],
        [9, 10, 0.03181, 0.0845, 0, 0, 0, 0, 0, 0, 1],
        [9, 14, 0.12711, 0.27038, 0, 0, 0, 0, 0, 0, 1],
        [10, 11, 0.08205, 0.19207, 0, 0, 0, 0, 0, 0, 1],
        [12, 13, 0.22092, 0.19988, 0, 0, 0, 0, 0, 0, 1],
        [13, 14, 0.17093, 0.34802, 0, 0, 0, 0, 0, 0, 1]
    ]
};

/**
 * IEEE 30-Bus Test System
 *
 * @description The IEEE 30-bus test system represents a portion of the American Electric
 * Power System as of December 1961. It contains 30 buses, 6 generators, 21 loads,
 * and 41 branches. This system is widely used for testing optimal power flow and
 * economic dispatch algorithms.
 *
 * @see IEEE Power Systems Test Case Archive
 * @see https://icseg.iti.illinois.edu/ieee-30-bus-system/
 *
 * @type {Object}
 * @property {string} name - System name
 * @property {number} baseMVA - Base power (100 MVA)
 * @property {Array<Array<number>>} bus - Bus data in MATPOWER format
 * @property {Array<Array<number>>} gen - Generator data in MATPOWER format
 * @property {Array<Array<number>>} branch - Branch data in MATPOWER format
 */
const IEEE_30_BUS = {
    name: 'IEEE 30-Bus Test System',
    baseMVA: 100,
    // Bus data: [BUS_I, TYPE, PD, QD, GS, BS, AREA, VM, VA, BASE_KV, ZONE, VMAX, VMIN]
    bus: [
        [1, 3, 0, 0, 0, 0, 1, 1.06, 0, 132, 1, 1.05, 0.95],   // Slack bus
        [2, 2, 21.7, 12.7, 0, 0, 1, 1.043, 0, 132, 1, 1.1, 0.95],
        [3, 1, 2.4, 1.2, 0, 0, 1, 1, 0, 132, 1, 1.05, 0.95],
        [4, 1, 7.6, 1.6, 0, 0, 1, 1, 0, 132, 1, 1.05, 0.95],
        [5, 2, 94.2, 19, 0, 0, 1, 1.01, 0, 132, 1, 1.1, 0.95],
        [6, 1, 0, 0, 0, 0, 1, 1, 0, 132, 1, 1.05, 0.95],
        [7, 1, 22.8, 10.9, 0, 0, 1, 1, 0, 132, 1, 1.05, 0.95],
        [8, 2, 30, 30, 0, 0, 1, 1.01, 0, 132, 1, 1.1, 0.95],
        [9, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1.05, 0.95],
        [10, 1, 5.8, 2, 0, 19, 1, 1, 0, 33, 1, 1.05, 0.95],   // Shunt capacitor
        [11, 2, 0, 0, 0, 0, 1, 1.082, 0, 11, 1, 1.1, 0.95],
        [12, 1, 11.2, 7.5, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [13, 2, 0, 0, 0, 0, 1, 1.071, 0, 11, 1, 1.1, 0.95],
        [14, 1, 6.2, 1.6, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [15, 1, 8.2, 2.5, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [16, 1, 3.5, 1.8, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [17, 1, 9, 5.8, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [18, 1, 3.2, 0.9, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [19, 1, 9.5, 3.4, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [20, 1, 2.2, 0.7, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [21, 1, 17.5, 11.2, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [22, 1, 0, 0, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [23, 1, 3.2, 1.6, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [24, 1, 8.7, 6.7, 0, 4.3, 1, 1, 0, 33, 1, 1.05, 0.95], // Shunt capacitor
        [25, 1, 0, 0, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [26, 1, 3.5, 2.3, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [27, 1, 0, 0, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [28, 1, 0, 0, 0, 0, 1, 1, 0, 132, 1, 1.05, 0.95],
        [29, 1, 2.4, 0.9, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95],
        [30, 1, 10.6, 1.9, 0, 0, 1, 1, 0, 33, 1, 1.05, 0.95]
    ],
    // Generator data: [GEN_BUS, PG, QG, QMAX, QMIN, VG, MBASE, STATUS, PMAX, PMIN]
    gen: [
        [1, 260.2, -16.1, 10, -20, 1.06, 100, 1, 360.2, 0],   // Slack generator
        [2, 40, 50, 50, -20, 1.043, 100, 1, 140, 0],
        [5, 0, 37, 40, -15, 1.01, 100, 1, 100, 0],
        [8, 0, 37.3, 40, -15, 1.01, 100, 1, 100, 0],
        [11, 0, 16.2, 24, -10, 1.082, 100, 1, 100, 0],        // Synchronous condenser
        [13, 0, 10.6, 24, -10, 1.071, 100, 1, 100, 0]         // Synchronous condenser
    ],
    // Branch data: [F_BUS, T_BUS, R, X, B, RATE_A, RATE_B, RATE_C, TAP, SHIFT, STATUS]
    branch: [
        [1, 2, 0.0192, 0.0575, 0.0528, 130, 130, 130, 0, 0, 1],
        [1, 3, 0.0452, 0.1852, 0.0408, 130, 130, 130, 0, 0, 1],
        [2, 4, 0.057, 0.1737, 0.0368, 65, 65, 65, 0, 0, 1],
        [3, 4, 0.0132, 0.0379, 0.0084, 130, 130, 130, 0, 0, 1],
        [2, 5, 0.0472, 0.1983, 0.0418, 130, 130, 130, 0, 0, 1],
        [2, 6, 0.0581, 0.1763, 0.0374, 65, 65, 65, 0, 0, 1],
        [4, 6, 0.0119, 0.0414, 0.009, 90, 90, 90, 0, 0, 1],
        [5, 7, 0.046, 0.116, 0.0204, 70, 70, 70, 0, 0, 1],
        [6, 7, 0.0267, 0.082, 0.017, 130, 130, 130, 0, 0, 1],
        [6, 8, 0.012, 0.042, 0.009, 32, 32, 32, 0, 0, 1],
        [6, 9, 0, 0.208, 0, 65, 65, 65, 0.978, 0, 1],    // Transformer
        [6, 10, 0, 0.556, 0, 32, 32, 32, 0.969, 0, 1],   // Transformer
        [9, 11, 0, 0.208, 0, 65, 65, 65, 0, 0, 1],
        [9, 10, 0, 0.11, 0, 65, 65, 65, 0, 0, 1],
        [4, 12, 0, 0.256, 0, 65, 65, 65, 0.932, 0, 1],   // Transformer
        [12, 13, 0, 0.14, 0, 65, 65, 65, 0, 0, 1],
        [12, 14, 0.1231, 0.2559, 0, 32, 32, 32, 0, 0, 1],
        [12, 15, 0.0662, 0.1304, 0, 32, 32, 32, 0, 0, 1],
        [12, 16, 0.0945, 0.1987, 0, 32, 32, 32, 0, 0, 1],
        [14, 15, 0.221, 0.1997, 0, 16, 16, 16, 0, 0, 1],
        [16, 17, 0.0524, 0.1923, 0, 16, 16, 16, 0, 0, 1],
        [15, 18, 0.1073, 0.2185, 0, 16, 16, 16, 0, 0, 1],
        [18, 19, 0.0639, 0.1292, 0, 16, 16, 16, 0, 0, 1],
        [19, 20, 0.034, 0.068, 0, 32, 32, 32, 0, 0, 1],
        [10, 20, 0.0936, 0.209, 0, 32, 32, 32, 0, 0, 1],
        [10, 17, 0.0324, 0.0845, 0, 32, 32, 32, 0, 0, 1],
        [10, 21, 0.0348, 0.0749, 0, 32, 32, 32, 0, 0, 1],
        [10, 22, 0.0727, 0.1499, 0, 32, 32, 32, 0, 0, 1],
        [21, 22, 0.0116, 0.0236, 0, 32, 32, 32, 0, 0, 1],
        [15, 23, 0.1, 0.202, 0, 16, 16, 16, 0, 0, 1],
        [22, 24, 0.115, 0.179, 0, 16, 16, 16, 0, 0, 1],
        [23, 24, 0.132, 0.27, 0, 16, 16, 16, 0, 0, 1],
        [24, 25, 0.1885, 0.3292, 0, 16, 16, 16, 0, 0, 1],
        [25, 26, 0.2544, 0.38, 0, 16, 16, 16, 0, 0, 1],
        [25, 27, 0.1093, 0.2087, 0, 16, 16, 16, 0, 0, 1],
        [28, 27, 0, 0.396, 0, 65, 65, 65, 0.968, 0, 1],  // Transformer
        [27, 29, 0.2198, 0.4153, 0, 16, 16, 16, 0, 0, 1],
        [27, 30, 0.3202, 0.6027, 0, 16, 16, 16, 0, 0, 1],
        [29, 30, 0.2399, 0.4533, 0, 16, 16, 16, 0, 0, 1],
        [8, 28, 0.0636, 0.2, 0.0428, 32, 32, 32, 0, 0, 1],
        [6, 28, 0.0169, 0.0599, 0.013, 32, 32, 32, 0, 0, 1]
    ]
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get all available IEEE test cases as an object
 *
 * @description Returns a mapping of case keys to case data objects.
 * Useful for populating dropdown menus or iterating through all cases.
 *
 * @returns {Object.<string, Object>} Object mapping case names to case data
 */
function getIEEECases() {
    return {
        case2: IEEE_2_BUS,
        case5: IEEE_5_BUS,
        case9: IEEE_9_BUS,
        case14: IEEE_14_BUS,
        case30: IEEE_30_BUS
    };
}

/**
 * Get IEEE test case by bus count
 *
 * @description Retrieves a specific IEEE test case by the number of buses.
 *
 * @param {number} busCount - Number of buses (2, 5, 9, 14, or 30)
 * @returns {Object|null} The case data object, or null if not found
 */
function getIEEECaseByBusCount(busCount) {
    const cases = {
        2: IEEE_2_BUS,
        5: IEEE_5_BUS,
        9: IEEE_9_BUS,
        14: IEEE_14_BUS,
        30: IEEE_30_BUS
    };
    return cases[busCount] || null;
}

/**
 * Validate IEEE case data structure
 *
 * @description Performs basic validation on case data to ensure it follows
 * MATPOWER v2 format requirements.
 *
 * @param {Object} caseData - Case data object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateIEEECase(caseData) {
    const errors = [];

    if (!caseData.name || typeof caseData.name !== 'string') {
        errors.push('Missing or invalid "name" property');
    }

    if (!caseData.baseMVA || typeof caseData.baseMVA !== 'number') {
        errors.push('Missing or invalid "baseMVA" property');
    }

    if (!Array.isArray(caseData.bus) || caseData.bus.length === 0) {
        errors.push('Missing or invalid "bus" array');
    } else {
        // Check bus data column count (should be 13)
        const invalidBuses = caseData.bus.filter(b => b.length < 13);
        if (invalidBuses.length > 0) {
            errors.push(`${invalidBuses.length} bus(es) have insufficient columns (expected 13)`);
        }

        // Check for exactly one slack bus (type 3)
        const slackCount = caseData.bus.filter(b => b[1] === 3).length;
        if (slackCount !== 1) {
            errors.push(`Expected exactly 1 slack bus, found ${slackCount}`);
        }
    }

    if (!Array.isArray(caseData.gen) || caseData.gen.length === 0) {
        errors.push('Missing or invalid "gen" array');
    } else {
        // Check generator data column count (should be 10)
        const invalidGens = caseData.gen.filter(g => g.length < 10);
        if (invalidGens.length > 0) {
            errors.push(`${invalidGens.length} generator(s) have insufficient columns (expected 10)`);
        }
    }

    if (!Array.isArray(caseData.branch) || caseData.branch.length === 0) {
        errors.push('Missing or invalid "branch" array');
    } else {
        // Check branch data column count (should be 11)
        const invalidBranches = caseData.branch.filter(br => br.length < 11);
        if (invalidBranches.length > 0) {
            errors.push(`${invalidBranches.length} branch(es) have insufficient columns (expected 11)`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ============================================================
// Export for Browser and Module Systems
// ============================================================

// For browser global scope
if (typeof window !== 'undefined') {
    window.IEEE_2_BUS = IEEE_2_BUS;
    window.IEEE_5_BUS = IEEE_5_BUS;
    window.IEEE_9_BUS = IEEE_9_BUS;
    window.IEEE_14_BUS = IEEE_14_BUS;
    window.IEEE_30_BUS = IEEE_30_BUS;
    window.getIEEECases = getIEEECases;
    window.getIEEECaseByBusCount = getIEEECaseByBusCount;
    window.validateIEEECase = validateIEEECase;

    // Also provide as IEEE_CASES object for convenience
    window.IEEE_CASES = {
        IEEE_2_BUS,
        IEEE_5_BUS,
        IEEE_9_BUS,
        IEEE_14_BUS,
        IEEE_30_BUS
    };
}

// For ES6 module systems (wrapped to prevent errors in non-module context)
// export {
//     IEEE_2_BUS,
//     IEEE_5_BUS,
//     IEEE_9_BUS,
//     IEEE_14_BUS,
//     IEEE_30_BUS,
//     getIEEECases,
//     getIEEECaseByBusCount,
//     validateIEEECase
// };
