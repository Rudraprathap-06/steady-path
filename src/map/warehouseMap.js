// ============================================================
// SteadyPath — Warehouse Map
// ============================================================
// Authoritative map representation: dimensions, obstacles,
// road network, and occupancy grid for A*.
// ============================================================

import { WAREHOUSE, PLANNER_CONFIG, VEHICLE_CONFIG } from '../config/config.js';
import { createStaticObstacles, createRestrictedZones, createLoadingZones } from './staticObstacles.js';
import { DynamicObstacles } from './dynamicObstacles.js';

/**
 * WarehouseMap — single source of truth for the environment.
 */
export class WarehouseMap {
    constructor() {
        this.width = WAREHOUSE.width;
        this.height = WAREHOUSE.height;

        this.staticObstacles = createStaticObstacles();
        this.restrictedZones = createRestrictedZones();
        this.loadingZones = createLoadingZones();
        this.dynamicObstacles = new DynamicObstacles();

        // All blocking obstacles (static + restricted)
        this.blockingObstacles = [...this.staticObstacles, ...this.restrictedZones];

        // Grid
        this.resolution = PLANNER_CONFIG.gridResolution;
        this.gridCols = Math.ceil(this.width / this.resolution);
        this.gridRows = Math.ceil(this.height / this.resolution);

        // Build occupancy grid (true = free, false = blocked)
        this.grid = this._buildGrid();
    }

    // ── Grid Construction ──────────────────────────────────

    /**
     * Build the base occupancy grid from static obstacles.
     * Inflates obstacles by vehicle half-size + safety margin.
     * @returns {boolean[][]} grid[row][col], true = free
     */
    _buildGrid() {
        const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;
        const grid = [];
        for (let r = 0; r < this.gridRows; r++) {
            grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const wx = c * this.resolution;
                const wy = r * this.resolution;
                grid[r][c] = !this._isStaticBlocked(wx, wy, inflate);
            }
        }
        return grid;
    }

    /**
     * Check if a world point (inflated) collides with any static obstacle or is outside bounds.
     */
    _isStaticBlocked(wx, wy, inflate) {
        // Boundary check with inflation
        if (wx - inflate < 0 || wx + inflate > this.width ||
            wy - inflate < 0 || wy + inflate > this.height) {
            return true;
        }
        for (const obs of this.blockingObstacles) {
            if (wx + inflate > obs.x && wx - inflate < obs.x + obs.width &&
                wy + inflate > obs.y && wy - inflate < obs.y + obs.height) {
                return true;
            }
        }
        return false;
    }

    // ── Query Methods ──────────────────────────────────────

    /**
     * Convert world coordinates to grid cell.
     * @param {number} wx
     * @param {number} wy
     * @returns {{col: number, row: number}}
     */
    worldToGrid(wx, wy) {
        return {
            col: Math.round(wx / this.resolution),
            row: Math.round(wy / this.resolution),
        };
    }

    /**
     * Convert grid cell to world coordinates.
     * @param {number} col
     * @param {number} row
     * @returns {{x: number, y: number}}
     */
    gridToWorld(col, row) {
        return {
            x: col * this.resolution,
            y: row * this.resolution,
        };
    }

    /**
     * Is a grid cell free? Checks static grid + dynamic obstacles.
     * @param {number} col
     * @param {number} row
     * @returns {boolean}
     */
    isCellFree(col, row) {
        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            return false;
        }
        // Static grid
        if (!this.grid[row][col]) return false;
        // Dynamic obstacles
        const { x, y } = this.gridToWorld(col, row);
        const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;
        return !this.dynamicObstacles.isRectBlocked(
            x - inflate, y - inflate, inflate * 2, inflate * 2
        );
    }

    /**
     * Is a world point inside the warehouse and on drivable space?
     * @param {number} wx
     * @param {number} wy
     * @returns {boolean}
     */
    isValidPosition(wx, wy) {
        if (wx < 0 || wx > this.width || wy < 0 || wy > this.height) return false;
        const { col, row } = this.worldToGrid(wx, wy);
        return this.isCellFree(col, row);
    }

    /**
     * Is a world point inside the warehouse bounds?
     * @param {number} wx
     * @param {number} wy
     * @returns {boolean}
     */
    isInsideBounds(wx, wy) {
        return wx >= 0 && wx <= this.width && wy >= 0 && wy <= this.height;
    }

    /**
     * Check if a world point is inside any static obstacle (without inflation).
     * @param {number} wx
     * @param {number} wy
     * @returns {boolean}
     */
    isInsideObstacle(wx, wy) {
        for (const obs of this.blockingObstacles) {
            if (wx >= obs.x && wx <= obs.x + obs.width &&
                wy >= obs.y && wy <= obs.y + obs.height) {
                return true;
            }
        }
        return this.dynamicObstacles.isBlocked(wx, wy);
    }

    /**
     * Snap a world point to the nearest free grid cell.
     * @param {number} wx
     * @param {number} wy
     * @returns {{x: number, y: number}|null}
     */
    snapToFreeCell(wx, wy) {
        const { col, row } = this.worldToGrid(wx, wy);
        if (this.isCellFree(col, row)) {
            return this.gridToWorld(col, row);
        }
        // Search expanding ring
        for (let radius = 1; radius < 20; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
                    const nc = col + dc;
                    const nr = row + dr;
                    if (this.isCellFree(nc, nr)) {
                        return this.gridToWorld(nc, nr);
                    }
                }
            }
        }
        return null;
    }
}
