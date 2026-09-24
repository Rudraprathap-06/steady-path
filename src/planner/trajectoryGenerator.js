// ============================================================
// SteadyPath — Trajectory Generator
// ============================================================
// Produces [x, y, heading, desiredSpeed] reference trajectory
// from a smoothed path.
// ============================================================

import { SPEED_CONFIG } from '../config/config.js';

/**
 * Generate a reference trajectory from a smoothed path.
 * Each point gets heading (radians) and desired speed (m/s).
 *
 * @param {{x: number, y: number}[]} path — smoothed path
 * @returns {{x: number, y: number, heading: number, desiredSpeed: number}[]}
 */
export function generateTrajectory(path) {
    if (path.length === 0) return [];
    if (path.length === 1) {
        return [{ x: path[0].x, y: path[0].y, heading: 0, desiredSpeed: 0 }];
    }

    // ── Step 1: Compute headings ────────────────────────────
    const headings = [];
    for (let i = 0; i < path.length; i++) {
        let heading;
        if (i < path.length - 1) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            heading = Math.atan2(dy, dx);
        } else {
            heading = headings[i - 1]; // last point keeps previous heading
        }
        headings.push(heading);
    }

    // ── Step 2: Compute curvature-based desired speeds ──────
    const trajectory = [];
    for (let i = 0; i < path.length; i++) {
        let speed;
        if (i === 0 || i === path.length - 1) {
            // Start/end — slow
            speed = SPEED_CONFIG.sharpTurn;
        } else {
            const dHeading = Math.abs(normalizeAngle(headings[i] - headings[i - 1]));
            if (dHeading >= SPEED_CONFIG.uTurnThreshold) {
                speed = SPEED_CONFIG.uTurn;
            } else if (dHeading >= SPEED_CONFIG.sharpTurnThreshold) {
                speed = SPEED_CONFIG.sharpTurn;
            } else if (dHeading >= SPEED_CONFIG.moderateTurnThreshold) {
                speed = SPEED_CONFIG.moderateTurn;
            } else {
                speed = SPEED_CONFIG.straight;
            }
        }

        trajectory.push({
            x: path[i].x,
            y: path[i].y,
            heading: headings[i],
            desiredSpeed: speed,
        });
    }

    // Last point: zero speed (stop at destination)
    trajectory[trajectory.length - 1].desiredSpeed = 0;

    console.log(`[TRAJECTORY] Generated ${trajectory.length} waypoints`);
    return trajectory;
}

/**
 * Compute total path length in meters.
 * @param {{x: number, y: number}[]} path
 * @returns {number}
 */
export function pathLength(path) {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}

/**
 * Normalize angle to [-π, π].
 * @param {number} angle — radians
 * @returns {number}
 */
function normalizeAngle(angle) {
    while (angle > Math.PI)  angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}
