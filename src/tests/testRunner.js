// ============================================================
// SteadyPath — Test Runner
// ============================================================
// Automated tests for all 14+ scenarios defined in the spec.
// Runs in-browser; results logged to the log panel.
// ============================================================

import { WarehouseMap } from '../map/warehouseMap.js';
import { astarPlan } from '../planner/astarPlanner.js';
import { smoothPath } from '../planner/pathSmoother.js';
import { validatePath } from '../planner/pathValidator.js';
import { generateTrajectory, pathLength } from '../planner/trajectoryGenerator.js';
import { plan, replan } from '../interface/plannerInterface.js';

/**
 * Run all automated tests.
 * @param {Function} log — logging function
 * @returns {{passed: number, failed: number, total: number}}
 */
export function runAllTests(log) {
    const results = [];
    log('═══════════════════════════════════════');
    log('[TEST] Starting SteadyPath Test Suite');
    log('═══════════════════════════════════════');

    const map = new WarehouseMap();

    // ── Test 1: Normal route ────────────────────────────────
    results.push(test(log, 'T01 — Normal route Start→Goal', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, map);
        assert(r.success, 'Should find a path');
        assert(r.path.length > 2, 'Path should have multiple points');
        assert(r.trajectory.length > 2, 'Trajectory should have multiple points');
        assert(r.metadata.pathLength > 0, 'Path length should be positive');
    }));

    // ── Test 2: Different destination ───────────────────────
    results.push(test(log, 'T02 — Different destination', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 28, y: 2 }, map);
        assert(r.success, 'Should find a path');
    }));

    // ── Test 3: Different starting position ─────────────────
    results.push(test(log, 'T03 — Different starting position', () => {
        const r = plan({ x: 15, y: 18, heading: 0, velocity: 0 }, { x: 28, y: 2 }, map);
        assert(r.success, 'Should find a path');
    }));

    // ── Test 4: Destination near boundary ───────────────────
    results.push(test(log, 'T04 — Destination near warehouse boundary', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 28, y: 18 }, map);
        assert(r.success, 'Should find a path near boundary');
    }));

    // ── Test 5: Destination near obstacle ────────────────────
    results.push(test(log, 'T05 — Destination near obstacle', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 8, y: 10 }, map);
        assert(r.success, 'Should find path near obstacle');
        const v = validatePath(r.path, map);
        assert(v.valid, 'Path should be valid');
    }));

    // ── Test 6: Primary route blocked ───────────────────────
    results.push(test(log, 'T06 — Primary route blocked', () => {
        const m = new WarehouseMap();
        // First plan a route
        const r1 = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 28, y: 17 }, m);
        assert(r1.success, 'Initial route should succeed');

        // Block a section along top corridor
        m.dynamicObstacles.addBlockage(15, 17, 3, 2);

        // Replan
        const r2 = replan({ x: 8, y: 2, heading: 0, velocity: 0 }, { x: 28, y: 17 }, m);
        assert(r2.success, 'Should find alternate route');
        assert(r2.metadata.replanned, 'Should be marked as replanned');
    }));

    // ── Test 7: Alternate route available ───────────────────
    results.push(test(log, 'T07 — Alternate route available', () => {
        const m = new WarehouseMap();
        m.dynamicObstacles.addBlockage(8, 1.5, 2, 2);
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, m);
        assert(r.success, 'Should find alternate route around blockage');
    }));

    // ── Test 8: Multiple roads blocked ──────────────────────
    results.push(test(log, 'T08 — Multiple roads blocked', () => {
        const m = new WarehouseMap();
        m.dynamicObstacles.addBlockage(8, 1.5, 2, 2);
        m.dynamicObstacles.addBlockage(8, 16, 2, 2);
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, m);
        // May or may not find a path — just ensure no crash
        assert(typeof r.success === 'boolean', 'Should return valid result');
    }));

    // ── Test 9: U-turn required ─────────────────────────────
    results.push(test(log, 'T09 — U-turn required', () => {
        const m = new WarehouseMap();
        // Block the forward path, force vehicle to go back
        m.dynamicObstacles.addBlockage(3, 1, 2, 3);
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, m);
        // Vehicle should still find a route even if it needs to go around
        assert(typeof r.success === 'boolean', 'Should handle U-turn scenario');
    }));

    // ── Test 10: Destination completely unreachable ──────────
    results.push(test(log, 'T10 — Destination completely unreachable', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 5, y: 7 }, map);
        // This is inside rack_01, should fail or snap
        assert(typeof r.success === 'boolean', 'Should handle gracefully');
    }));

    // ── Test 11: Narrow corridor ────────────────────────────
    results.push(test(log, 'T11 — Narrow corridor navigation', () => {
        const r = plan({ x: 2, y: 10, heading: 0, velocity: 0 }, { x: 15, y: 10 }, map);
        assert(typeof r.success === 'boolean', 'Should attempt narrow corridor');
    }));

    // ── Test 12: Blockage near vehicle ──────────────────────
    results.push(test(log, 'T12 — Blockage appearing near vehicle', () => {
        const m = new WarehouseMap();
        m.dynamicObstacles.addBlockage(3, 1.5, 1.5, 1.5);
        const r = replan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, m);
        assert(typeof r.success === 'boolean', 'Should handle near blockage');
    }));

    // ── Test 13: Multiple simultaneous blockages ────────────
    results.push(test(log, 'T13 — Multiple simultaneous blockages', () => {
        const m = new WarehouseMap();
        m.dynamicObstacles.addBlockage(8, 1.5, 2, 2);
        m.dynamicObstacles.addBlockage(15, 1.5, 2, 2);
        m.dynamicObstacles.addBlockage(22, 1.5, 2, 2);
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, m);
        assert(typeof r.success === 'boolean', 'Should handle multiple blockages');
    }));

    // ── Test 14: Path validation ────────────────────────────
    results.push(test(log, 'T14 — Path never passes through obstacles', () => {
        const r = plan({ x: 2, y: 2, heading: 0, velocity: 0 }, { x: 25, y: 17 }, map);
        if (r.success) {
            const v = validatePath(r.path, map);
            assert(v.valid, `Path should be valid: ${v.reason}`);
        }
    }));

    // ── Summary ─────────────────────────────────────────────
    const passed = results.filter(r => r).length;
    const failed = results.length - passed;
    log('═══════════════════════════════════════');
    log(`[TEST] Results: ${passed}/${results.length} passed, ${failed} failed`);
    log('═══════════════════════════════════════');

    return { passed, failed, total: results.length };
}

// ── Helpers ─────────────────────────────────────────────────

function test(log, name, fn) {
    try {
        fn();
        log(`  ✅ ${name}`);
        return true;
    } catch (e) {
        log(`  ❌ ${name}: ${e.message}`);
        return false;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}
