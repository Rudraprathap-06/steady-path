// ============================================================
// SteadyPath — Dynamic Obstacles
// ============================================================
// Manages temporary road blockages and obstacles that can be
// added/removed at runtime to trigger replanning.
// ============================================================

/**
 * Dynamic obstacle manager.
 * Blockages are rectangles: { id, x, y, width, height }.
 */
export class DynamicObstacles {
    constructor() {
        /** @type {Map<string, Object>} */
        this._obstacles = new Map();
        this._nextId = 1;
    }

    /**
     * Add a rectangular blockage.
     * @param {number} x - Bottom-left X (meters)
     * @param {number} y - Bottom-left Y (meters)
     * @param {number} width - Width (meters)
     * @param {number} height - Height (meters)
     * @returns {string} The blockage ID.
     */
    addBlockage(x, y, width = 1.5, height = 1.5) {
        const id = `blockage_${this._nextId++}`;
        this._obstacles.set(id, { id, x, y, width, height, type: 'blockage' });
        console.log(`[DYNAMIC] Added blockage ${id} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        return id;
    }

    /**
     * Remove a specific blockage by ID.
     * @param {string} id
     * @returns {boolean} True if removed.
     */
    removeBlockage(id) {
        const removed = this._obstacles.delete(id);
        if (removed) console.log(`[DYNAMIC] Removed blockage ${id}`);
        return removed;
    }

    /** Remove all dynamic blockages. */
    clearAll() {
        this._obstacles.clear();
        console.log('[DYNAMIC] All blockages cleared');
    }

    /**
     * Get all current blockages as an array.
     * @returns {Object[]}
     */
    getAll() {
        return Array.from(this._obstacles.values());
    }

    /**
     * Check if a point (px, py) is inside any dynamic blockage.
     * @param {number} px
     * @param {number} py
     * @returns {boolean}
     */
    isBlocked(px, py) {
        for (const obs of this._obstacles.values()) {
            if (px >= obs.x && px <= obs.x + obs.width &&
                py >= obs.y && py <= obs.y + obs.height) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a rectangle overlaps any dynamic blockage.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @returns {boolean}
     */
    isRectBlocked(x, y, w, h) {
        for (const obs of this._obstacles.values()) {
            if (x < obs.x + obs.width && x + w > obs.x &&
                y < obs.y + obs.height && y + h > obs.y) {
                return true;
            }
        }
        return false;
    }

    get count() {
        return this._obstacles.size;
    }
}
