// ============================================================
// SteadyPath — Static Obstacles
// ============================================================
// Defines all permanent warehouse obstacles: racks, walls,
// pillars, loading zones, and restricted zones.
// ============================================================

import { WAREHOUSE } from '../config/config.js';

/**
 * Create the default set of static obstacles for the warehouse.
 * Each obstacle has: id, type, x, y, width, height.
 * (x, y) is the bottom-left corner of the obstacle rectangle.
 *
 * @returns {Object[]} Array of static obstacle descriptors.
 */
export function createStaticObstacles() {
    return [
        // ── Storage Racks ─────────────────────────────────
        // Left block (two racks)
        { id: 'rack_01', type: 'rack', x: 4,  y: 5,  width: 3, height: 4 },
        { id: 'rack_02', type: 'rack', x: 4,  y: 11, width: 3, height: 4 },

        // Center block (two racks)
        { id: 'rack_03', type: 'rack', x: 11, y: 5,  width: 3, height: 4 },
        { id: 'rack_04', type: 'rack', x: 11, y: 11, width: 3, height: 4 },

        // Right block (two racks)
        { id: 'rack_05', type: 'rack', x: 18, y: 5,  width: 3, height: 4 },
        { id: 'rack_06', type: 'rack', x: 18, y: 11, width: 3, height: 4 },

        // ── Walls ─────────────────────────────────────────
        // Small interior wall segment (creates a corridor split)
        { id: 'wall_01', type: 'wall', x: 25, y: 8, width: 0.5, height: 4 },

        // ── Pillars ───────────────────────────────────────
        { id: 'pillar_01', type: 'pillar', x: 9,  y: 9.7,  width: 0.6, height: 0.6 },
        { id: 'pillar_02', type: 'pillar', x: 16, y: 9.7,  width: 0.6, height: 0.6 },
    ];
}

/**
 * Create loading zone descriptors (non-blocking, visual only).
 * @returns {Object[]}
 */
export function createLoadingZones() {
    return [
        { id: 'loading_01', type: 'loading', x: 26, y: 1,  width: 3, height: 3, label: 'Load A' },
        { id: 'loading_02', type: 'loading', x: 26, y: 16, width: 3, height: 3, label: 'Load B' },
    ];
}

/**
 * Create restricted zone descriptors (blocking, like obstacles).
 * @returns {Object[]}
 */
export function createRestrictedZones() {
    return [
        { id: 'restricted_01', type: 'restricted', x: 15, y: 6.5, width: 2, height: 2.5 },
    ];
}
