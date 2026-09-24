// ============================================================
// SteadyPath — Dynamic Replanner
// ============================================================
// Handles dynamic path replanning when unexpected blockages occur.
// Features:
// - Uses current vehicle position as NEW START
// - Retains original destination as SAME GOAL
// - Finds collision-free alternate routes via A*
// - Detects and handles U-turn situations
// - Generates updated reference trajectory for MPC
// ============================================================

import { astarPlan } from './astarPlanner.js';
import { smoothPath } from './pathSmoother.js';
import { validatePath, checkPathBlocked } from './pathValidator.js';
import { generateTrajectory, pathLength } from './trajectoryGenerator.js';
import { SPEED_CONFIG } from '../config/config.js';

/**
 * Replan a route dynamically from the vehicle's current state to the goal.
 *
 * @param {{x: number, y: number, heading: number, velocity: number}} currentState
 * @param {{x: number, y: number}} destination
 * @param {import('../map/warehouseMap.js').WarehouseMap} updatedMapState
 * @returns {import('../interface/plannerInterface.js').PlannerResult}
 */
export function dynamicReplan(currentState, destination, updatedMapState) {
    const t0 = performance.now();
    console.log('[REPLANNER] Dynamic replanning triggered');
    console.log(`[REPLANNER] Current position: (${currentState.x.toFixed(1)}, ${currentState.y.toFixed(1)}), heading: ${currentState.heading.toFixed(2)} rad`);
    console.log(`[REPLANNER] Original goal: (${destination.x.toFixed(1)}, ${destination.y.toFixed(1)})`);

    // ── Validate destination bounds & obstacles ─────────────
    if (!updatedMapState.isInsideBounds(destination.x, destination.y)) {
        console.warn('[REPLANNER] Destination outside warehouse bounds');
        return _failResult('INVALID_DESTINATION', 'Destination outside warehouse.', t0);
    }
    if (updatedMapState.isInsideObstacle(destination.x, destination.y)) {
        console.warn('[REPLANNER] Destination is blocked');
        return _failResult('INVALID_DESTINATION', 'Destination is blocked by an obstacle.', t0);
    }

    // ── Snap start to nearest free cell if close to obstacle
    let start = { x: currentState.x, y: currentState.y };
    if (!updatedMapState.isValidPosition(start.x, start.y)) {
        const snapped = updatedMapState.snapToFreeCell(start.x, start.y);
        if (snapped) {
            console.warn(`[REPLANNER] Start snapped to (${snapped.x.toFixed(1)}, ${snapped.y.toFixed(1)})`);
            start = snapped;
        } else {
            console.warn('[REPLANNER] Vehicle position trapped in obstacle');
            return _failResult('INVALID_START', 'Vehicle position is blocked.', t0);
        }
    }

    // ── Snap goal to nearest free cell if needed ────────────
    let goal = { x: destination.x, y: destination.y };
    if (!updatedMapState.isValidPosition(goal.x, goal.y)) {
        const snapped = updatedMapState.snapToFreeCell(goal.x, goal.y);
        if (snapped) {
            goal = snapped;
        } else {
            return _failResult('NO_PATH', 'Destination is unreachable.', t0);
        }
    }

    // ── Run A* on updated map ───────────────────────────────
    console.log('[REPLANNER] Running A* search for alternate route');
    const astarResult = astarPlan(start, goal, updatedMapState);

    if (!astarResult.success || astarResult.path.length < 2) {
        console.warn('[REPLANNER] No alternate route found to destination');
        return _failResult('NO_PATH', 'No alternate route available.', t0, astarResult.nodesExplored);
    }

    console.log(`[REPLANNER] Alternate raw path found with ${astarResult.path.length} waypoints`);

    // ── Smooth path ─────────────────────────────────────────
    const smoothed = smoothPath(astarResult.path, updatedMapState);
    const validation = validatePath(smoothed, updatedMapState);
    const finalPath = validation.valid ? smoothed : astarResult.path;

    // ── Check if U-turn is required ─────────────────────────
    let uTurnRequired = false;
    if (finalPath.length >= 2) {
        const initialHeading = Math.atan2(finalPath[1].y - finalPath[0].y, finalPath[1].x - finalPath[0].x);
        let headingDiff = Math.abs(initialHeading - currentState.heading);
        while (headingDiff > Math.PI) headingDiff = Math.abs(headingDiff - 2 * Math.PI);
        if (headingDiff >= SPEED_CONFIG.uTurnThreshold) {
            uTurnRequired = true;
            console.log(`[REPLANNER] U-turn required (${(headingDiff * 180 / Math.PI).toFixed(0)}° reversal)`);
        }
    }

    // ── Generate trajectory ─────────────────────────────────
    const trajectory = generateTrajectory(finalPath);
    if (uTurnRequired && trajectory.length > 0) {
        // Enforce U-turn speed on initial segment
        trajectory[0].desiredSpeed = SPEED_CONFIG.uTurn;
        if (trajectory.length > 1) {
            trajectory[1].desiredSpeed = Math.min(trajectory[1].desiredSpeed, SPEED_CONFIG.uTurn);
        }
    }

    const len = pathLength(finalPath);
    const timeMs = performance.now() - t0;

    console.log(`[REPLANNER] Alternate route generated: ${len.toFixed(1)} m in ${timeMs.toFixed(1)} ms`);

    return {
        success: true,
        status: 'REPLANNED',
        path: finalPath,
        rawPath: astarResult.path,
        trajectory,
        metadata: {
            pathLength: len,
            planningTimeMs: timeMs,
            replanned: true,
            uTurnRequired,
            nodesExplored: astarResult.nodesExplored,
        },
    };
}

/**
 * Check if the active path is blocked at or after the vehicle's current index.
 *
 * @param {{x: number, y: number}[]} path
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @param {number} currentIndex
 * @returns {{blocked: boolean, blockIndex: number}}
 */
export function isPathBlocked(path, map, currentIndex) {
    return checkPathBlocked(path, map, currentIndex);
}

function _failResult(status, reason, t0, nodesExplored = 0) {
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
            replanned: true,
            uTurnRequired: false,
            nodesExplored,
        },
    };
}
