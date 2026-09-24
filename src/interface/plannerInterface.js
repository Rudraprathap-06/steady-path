// ============================================================
// SteadyPath — Planner Interface (Frozen API)
// ============================================================
// ONE stable public API for the path planner.
// This is the contract consumed by MPC.
// ============================================================

import { astarPlan } from '../planner/astarPlanner.js';
import { smoothPath } from '../planner/pathSmoother.js';
import { validatePath } from '../planner/pathValidator.js';
import { generateTrajectory, pathLength } from '../planner/trajectoryGenerator.js';
import { dynamicReplan, isPathBlocked } from '../planner/replanner.js';

/**
 * @typedef {Object} PlannerResult
 * @property {boolean} success
 * @property {string} status — PATH_FOUND | NO_PATH | INVALID_DESTINATION | INVALID_START | REPLANNED
 * @property {{x: number, y: number}[]} path — smoothed path
 * @property {{x: number, y: number}[]} rawPath — raw A* path
 * @property {{x: number, y: number, heading: number, desiredSpeed: number}[]} trajectory
 * @property {{pathLength: number, planningTimeMs: number, replanned: boolean, nodesExplored: number}} metadata
 */

/**
 * Plan a route from currentState to destination.
 *
 * @param {{x: number, y: number, heading: number, velocity: number}} currentState
 * @param {{x: number, y: number}} destination
 * @param {import('../map/warehouseMap.js').WarehouseMap} mapState
 * @returns {PlannerResult}
 */
export function plan(currentState, destination, mapState) {
    const t0 = performance.now();
    console.log(`[PLANNER] New destination: (${destination.x.toFixed(1)}, ${destination.y.toFixed(1)})`);
    console.log(`[PLANNER] Start: (${currentState.x.toFixed(1)}, ${currentState.y.toFixed(1)})`);

    // ── Validate destination ────────────────────────────────
    if (!mapState.isInsideBounds(destination.x, destination.y)) {
        console.warn('[PLANNER] Destination outside warehouse');
        return _fail('INVALID_DESTINATION', 'Destination outside warehouse.', t0);
    }
    if (mapState.isInsideObstacle(destination.x, destination.y)) {
        console.warn('[PLANNER] Destination is blocked');
        return _fail('INVALID_DESTINATION', 'Destination is blocked.', t0);
    }

    // ── Validate start ──────────────────────────────────────
    let start = { x: currentState.x, y: currentState.y };
    if (!mapState.isValidPosition(start.x, start.y)) {
        // Try snapping to nearest free cell
        const snapped = mapState.snapToFreeCell(start.x, start.y);
        if (snapped) {
            console.warn(`[PLANNER] Start snapped from (${start.x.toFixed(1)}, ${start.y.toFixed(1)}) to (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
            start = snapped;
        } else {
            console.warn('[PLANNER] Current vehicle position is invalid');
            return _fail('INVALID_START', 'Current vehicle position is invalid.', t0);
        }
    }

    // ── Snap goal to nearest free cell ──────────────────────
    let goal = { x: destination.x, y: destination.y };
    if (!mapState.isValidPosition(goal.x, goal.y)) {
        const snapped = mapState.snapToFreeCell(goal.x, goal.y);
        if (snapped) {
            goal = snapped;
        } else {
            return _fail('NO_PATH', 'No valid route exists.', t0);
        }
    }

    // ── Run A* ──────────────────────────────────────────────
    console.log('[PLANNER] Running A*');
    const astarResult = astarPlan(start, goal, mapState);

    if (!astarResult.success) {
        return _fail('NO_PATH', 'No valid route exists.', t0, astarResult.nodesExplored);
    }

    console.log(`[PLANNER] Raw path points: ${astarResult.path.length}`);

    // ── Smooth ──────────────────────────────────────────────
    const smoothed = smoothPath(astarResult.path, mapState);
    console.log(`[PLANNER] Smoothed path points: ${smoothed.length}`);

    // ── Validate smoothed path ──────────────────────────────
    const validation = validatePath(smoothed, mapState);
    const finalPath = validation.valid ? smoothed : astarResult.path;
    if (!validation.valid) {
        console.warn('[PLANNER] Smoothed path invalid, using raw path');
    }

    // ── Generate trajectory ─────────────────────────────────
    const trajectory = generateTrajectory(finalPath);
    const len = pathLength(finalPath);
    const timeMs = performance.now() - t0;

    console.log(`[PLANNER] Trajectory generated`);
    console.log(`[PLANNER] Route length: ${len.toFixed(1)} m`);

    return {
        success: true,
        status: 'PATH_FOUND',
        path: finalPath,
        rawPath: astarResult.path,
        trajectory,
        metadata: {
            pathLength: len,
            planningTimeMs: timeMs,
            replanned: false,
            nodesExplored: astarResult.nodesExplored,
        },
    };
}

/**
 * Replan from current vehicle position to the original destination
 * using an updated map (with new dynamic obstacles).
 *
 * @param {{x: number, y: number, heading: number, velocity: number}} currentState
 * @param {{x: number, y: number}} destination
 * @param {import('../map/warehouseMap.js').WarehouseMap} updatedMapState
 * @returns {PlannerResult}
 */
export function replan(currentState, destination, updatedMapState) {
    return dynamicReplan(currentState, destination, updatedMapState);
}

/**
 * Check if the current path is blocked ahead of a given index.
 *
 * @param {{x: number, y: number}[]} path
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @param {number} currentIndex
 * @returns {{blocked: boolean, blockIndex: number}}
 */
export function isCurrentPathBlocked(path, map, currentIndex) {
    return isPathBlocked(path, map, currentIndex);
}

// ── Helpers ─────────────────────────────────────────────────

function _fail(status, reason, t0, nodesExplored = 0) {
    return {
        success: false,
        status,
        reason,
        path: [],
        rawPath: [],
        trajectory: [],
        metadata: {
            pathLength: 0,
            planningTimeMs: performance.now() - t0,
            replanned: false,
            nodesExplored,
        },
    };
}
