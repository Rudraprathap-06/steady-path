// ============================================================
// SteadyPath — 3D Coordinate Mapping Utilities
// ============================================================
// Maps between 2D warehouse coordinates (0..30m, 0..20m)
// and Three.js 3D world space (centered at origin on XZ plane).
// ============================================================

import { WAREHOUSE } from '../config/config.js';

export const HALF_WIDTH = WAREHOUSE.width / 2;   // 15.0 m
export const HALF_HEIGHT = WAREHOUSE.height / 2; // 10.0 m

/**
 * Convert 2D warehouse coordinates to 3D Three.js coordinates.
 * @param {number} wx - warehouse X (0 to 30)
 * @param {number} wy - warehouse Y (0 to 20)
 * @param {number} [elevation=0] - elevation above floor in meters
 * @returns {{x: number, y: number, z: number}}
 */
export function worldToThree(wx, wy, elevation = 0) {
    return {
        x: wx - HALF_WIDTH,
        y: elevation,
        z: HALF_HEIGHT - wy,
    };
}

/**
 * Convert 3D Three.js coordinates on floor plane to 2D warehouse coordinates.
 * @param {number} tx - Three.js X
 * @param {number} tz - Three.js Z
 * @returns {{x: number, y: number}}
 */
export function threeToWorld(tx, tz) {
    return {
        x: tx + HALF_WIDTH,
        y: HALF_HEIGHT - tz,
    };
}

/**
 * Convert 2D heading angle (radians, 0 = +X, PI/2 = +Y) to Three.js Y-rotation.
 * @param {number} heading
 * @returns {number}
 */
export function headingToThreeRotation(heading) {
    return heading;
}
