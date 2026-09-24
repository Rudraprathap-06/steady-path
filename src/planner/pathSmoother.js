// ============================================================
// SteadyPath — Path Smoother
// ============================================================
// Removes unnecessary zig-zags from raw A* paths using
// iterative shortcut + Chaikin subdivision smoothing.
// Always validates the result; falls back to raw path if
// smoothing introduces collisions.
// ============================================================

import { isSegmentClear } from './pathValidator.js';

/**
 * Smooth a raw A* path.
 *
 * 1. Shortcut pass — skip waypoints when a direct line is collision-free.
 * 2. Chaikin subdivision — round out remaining corners.
 * 3. Post-validation — ensure the result is still safe.
 *
 * @param {{x: number, y: number}[]} rawPath
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @returns {{x: number, y: number}[]}
 */
export function smoothPath(rawPath, map) {
    if (rawPath.length <= 2) return rawPath;

    // ── Pass 1: Shortcut ────────────────────────────────────
    let shortened = shortcutSmooth(rawPath, map);

    // ── Pass 2: Chaikin subdivision (2 iterations) ──────────
    let smoothed = shortened;
    for (let iter = 0; iter < 2; iter++) {
        smoothed = chaikinSubdivide(smoothed);
    }

    // ── Pass 3: Resample at grid resolution for smooth, continuous waypoints
    let resampled = resamplePath(smoothed, map.resolution);

    // ── Post-validation: check every segment ────────────────
    for (let i = 0; i < resampled.length - 1; i++) {
        if (!isSegmentClear(resampled[i], resampled[i + 1], map)) {
            console.warn('[SMOOTHER] Smoothed path has collision — falling back to shortened path');
            const resampledShort = resamplePath(shortened, map.resolution);
            for (let j = 0; j < resampledShort.length - 1; j++) {
                if (!isSegmentClear(resampledShort[j], resampledShort[j + 1], map)) {
                    return rawPath;
                }
            }
            return resampledShort;
        }
    }

    console.log(`[SMOOTHER] ${rawPath.length} → ${resampled.length} points`);
    return resampled;
}

/**
 * Resample polyline so waypoints are evenly spaced by resolution.
 */
function resamplePath(path, resolution) {
    if (path.length <= 1) return [...path];
    const result = [{ ...path[0] }];
    for (let i = 0; i < path.length - 1; i++) {
        const p0 = path[i];
        const p1 = path[i + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / resolution));
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            result.push({
                x: p0.x + dx * t,
                y: p0.y + dy * t,
            });
        }
    }
    return result;
}

// ── Shortcut Smoothing ──────────────────────────────────────

/**
 * Greedily skip intermediate waypoints if a direct line is clear.
 */
function shortcutSmooth(path, map) {
    if (path.length <= 2) return [...path];

    const result = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
        // Try to jump as far ahead as possible
        let farthest = current + 1;
        for (let ahead = path.length - 1; ahead > current + 1; ahead--) {
            if (isSegmentClear(path[current], path[ahead], map)) {
                farthest = ahead;
                break;
            }
        }
        result.push(path[farthest]);
        current = farthest;
    }

    return result;
}

// ── Chaikin Subdivision ─────────────────────────────────────

/**
 * One round of Chaikin's corner-cutting subdivision.
 * Preserves start and end points exactly.
 */
function chaikinSubdivide(path) {
    if (path.length <= 2) return [...path];

    const result = [path[0]];
    for (let i = 0; i < path.length - 1; i++) {
        const p0 = path[i];
        const p1 = path[i + 1];
        // Q = 3/4 * P0 + 1/4 * P1
        result.push({
            x: 0.75 * p0.x + 0.25 * p1.x,
            y: 0.75 * p0.y + 0.25 * p1.y,
        });
        // R = 1/4 * P0 + 3/4 * P1
        result.push({
            x: 0.25 * p0.x + 0.75 * p1.x,
            y: 0.25 * p0.y + 0.75 * p1.y,
        });
    }
    result.push(path[path.length - 1]);
    return result;
}
