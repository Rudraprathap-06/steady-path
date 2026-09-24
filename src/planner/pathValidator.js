// ============================================================
// SteadyPath — Path Validator
// ============================================================
// Validates that a path is safe: within bounds, no obstacle
// collisions, connected, and has vehicle clearance.
// ============================================================

import { WAREHOUSE, VEHICLE_CONFIG } from '../config/config.js';

/**
 * Validate a path against the warehouse map.
 *
 * @param {{x: number, y: number}[]} path
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @returns {{valid: boolean, reason: string}}
 */
export function validatePath(path, map) {
    if (!path || path.length === 0) {
        return { valid: false, reason: 'EMPTY_PATH' };
    }

    const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;

    for (let i = 0; i < path.length; i++) {
        const p = path[i];

        // ── Boundary check ──────────────────────────────
        if (p.x - inflate < 0 || p.x + inflate > WAREHOUSE.width ||
            p.y - inflate < 0 || p.y + inflate > WAREHOUSE.height) {
            return { valid: false, reason: `OUT_OF_BOUNDS at index ${i} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})` };
        }

        // ── Static obstacle collision ───────────────────
        for (const obs of map.blockingObstacles) {
            if (p.x + inflate > obs.x && p.x - inflate < obs.x + obs.width &&
                p.y + inflate > obs.y && p.y - inflate < obs.y + obs.height) {
                return { valid: false, reason: `STATIC_COLLISION with ${obs.id} at index ${i}` };
            }
        }

        // ── Dynamic obstacle collision ──────────────────
        if (map.dynamicObstacles.isRectBlocked(
            p.x - inflate, p.y - inflate, inflate * 2, inflate * 2)) {
            return { valid: false, reason: `DYNAMIC_COLLISION at index ${i}` };
        }
    }

    // ── Connectivity check ──────────────────────────────────
    const maxGap = map.resolution * 2; // allow slightly more than one cell diagonal
    for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxGap) {
            return { valid: false, reason: `DISCONNECTED at index ${i}, gap=${dist.toFixed(2)}m` };
        }
    }

    return { valid: true, reason: 'OK' };
}

/**
 * Check if a specific segment of a path is blocked by dynamic obstacles.
 * Useful for detecting blockages on the current route.
 *
 * @param {{x: number, y: number}[]} path
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @param {number} [startIndex=0] — only check from this index onward
 * @returns {{blocked: boolean, blockIndex: number}}
 */
export function checkPathBlocked(path, map, startIndex = 0) {
    const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;

    for (let i = startIndex; i < path.length; i++) {
        const p = path[i];
        if (map.dynamicObstacles.isRectBlocked(
            p.x - inflate, p.y - inflate, inflate * 2, inflate * 2)) {
            return { blocked: true, blockIndex: i };
        }
    }
    return { blocked: false, blockIndex: -1 };
}

/**
 * Check if a line segment between two points collides with any obstacle.
 * Used by the path smoother.
 *
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @param {number} [stepSize=0.25]
 * @returns {boolean} True if the segment is clear.
 */
export function isSegmentClear(a, b, map, stepSize = 0.25) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / stepSize);

    const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;

    for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const px = a.x + dx * t;
        const py = a.y + dy * t;

        // Boundary
        if (px - inflate < 0 || px + inflate > WAREHOUSE.width ||
            py - inflate < 0 || py + inflate > WAREHOUSE.height) {
            return false;
        }

        // Static obstacles
        for (const obs of map.blockingObstacles) {
            if (px + inflate > obs.x && px - inflate < obs.x + obs.width &&
                py + inflate > obs.y && py - inflate < obs.y + obs.height) {
                return false;
            }
        }

        // Dynamic obstacles
        if (map.dynamicObstacles.isRectBlocked(
            px - inflate, py - inflate, inflate * 2, inflate * 2)) {
            return false;
        }
    }
    return true;
}
