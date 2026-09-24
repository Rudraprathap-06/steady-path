// ============================================================
// SteadyPath — A* Path Planner
// ============================================================
// Grid-based A* with 8-directional movement and diagonal
// corner-cutting prevention.
// ============================================================

import { PLANNER_CONFIG } from '../config/config.js';

/**
 * A* path planner.
 *
 * @param {{x: number, y: number}} start — world coordinates
 * @param {{x: number, y: number}} goal  — world coordinates
 * @param {import('../map/warehouseMap.js').WarehouseMap} map
 * @returns {{success: boolean, path: {x: number, y: number}[], nodesExplored: number}}
 */
export function astarPlan(start, goal, map) {
    const t0 = performance.now();

    const startCell = map.worldToGrid(start.x, start.y);
    const goalCell  = map.worldToGrid(goal.x, goal.y);

    // Validate start & goal cells
    if (!map.isCellFree(startCell.col, startCell.row)) {
        console.warn('[PLANNER] Start cell is blocked');
        return { success: false, path: [], nodesExplored: 0, timeMs: performance.now() - t0 };
    }
    if (!map.isCellFree(goalCell.col, goalCell.row)) {
        console.warn('[PLANNER] Goal cell is blocked');
        return { success: false, path: [], nodesExplored: 0, timeMs: performance.now() - t0 };
    }

    // ── Directions ──────────────────────────────────────────
    const dirs = [
        { dc:  1, dr:  0, cost: 1 },   // right
        { dc: -1, dr:  0, cost: 1 },   // left
        { dc:  0, dr:  1, cost: 1 },   // up
        { dc:  0, dr: -1, cost: 1 },   // down
    ];
    if (PLANNER_CONFIG.allowDiagonal) {
        const D = Math.SQRT2;
        dirs.push(
            { dc:  1, dr:  1, cost: D },
            { dc: -1, dr:  1, cost: D },
            { dc:  1, dr: -1, cost: D },
            { dc: -1, dr: -1, cost: D },
        );
    }

    // ── Data structures ─────────────────────────────────────
    const cols = map.gridCols;
    const key = (c, r) => r * cols + c;

    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();
    const closedSet = new Set();

    const startKey = key(startCell.col, startCell.row);
    const goalKey  = key(goalCell.col, goalCell.row);

    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startCell, goalCell));

    // Min-heap (simple array-based binary heap)
    const openHeap = new MinHeap();
    openHeap.push({ key: startKey, col: startCell.col, row: startCell.row, f: fScore.get(startKey) });

    let nodesExplored = 0;

    // ── Main loop ───────────────────────────────────────────
    while (openHeap.size > 0) {
        const current = openHeap.pop();
        const ck = current.key;

        if (ck === goalKey) {
            // Reconstruct path
            const path = reconstructPath(cameFrom, ck, cols, map);
            const timeMs = performance.now() - t0;
            console.log(`[PLANNER] Path found — ${path.length} points, ${nodesExplored} nodes, ${timeMs.toFixed(1)} ms`);
            return { success: true, path, nodesExplored, timeMs };
        }

        if (closedSet.has(ck)) continue;
        closedSet.add(ck);
        nodesExplored++;

        for (const dir of dirs) {
            const nc = current.col + dir.dc;
            const nr = current.row + dir.dr;
            const nk = key(nc, nr);

            if (closedSet.has(nk)) continue;
            if (!map.isCellFree(nc, nr)) continue;

            // Diagonal corner-cutting prevention
            if (dir.dc !== 0 && dir.dr !== 0) {
                if (!map.isCellFree(current.col + dir.dc, current.row) ||
                    !map.isCellFree(current.col, current.row + dir.dr)) {
                    continue;
                }
            }

            const tentativeG = gScore.get(ck) + dir.cost;
            const prevG = gScore.get(nk);

            if (prevG === undefined || tentativeG < prevG) {
                cameFrom.set(nk, ck);
                gScore.set(nk, tentativeG);
                const f = tentativeG + heuristic({ col: nc, row: nr }, goalCell);
                fScore.set(nk, f);
                openHeap.push({ key: nk, col: nc, row: nr, f });
            }
        }
    }

    const timeMs = performance.now() - t0;
    console.warn(`[PLANNER] No valid path found — ${nodesExplored} nodes explored, ${timeMs.toFixed(1)} ms`);
    return { success: false, path: [], nodesExplored, timeMs };
}

// ── Heuristic (octile distance) ─────────────────────────────

function heuristic(a, b) {
    const dx = Math.abs(a.col - b.col);
    const dy = Math.abs(a.row - b.row);
    // Octile distance
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

// ── Path Reconstruction ─────────────────────────────────────

function reconstructPath(cameFrom, endKey, cols, map) {
    const path = [];
    let ck = endKey;
    while (ck !== undefined) {
        const row = Math.floor(ck / cols);
        const col = ck % cols;
        const world = map.gridToWorld(col, row);
        path.unshift(world);
        ck = cameFrom.get(ck);
    }
    return path;
}

// ── MinHeap ─────────────────────────────────────────────────

class MinHeap {
    constructor() {
        this._data = [];
    }

    get size() { return this._data.length; }

    push(node) {
        this._data.push(node);
        this._bubbleUp(this._data.length - 1);
    }

    pop() {
        const top = this._data[0];
        const last = this._data.pop();
        if (this._data.length > 0) {
            this._data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    _bubbleUp(i) {
        const d = this._data;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (d[i].f < d[p].f) {
                [d[i], d[p]] = [d[p], d[i]];
                i = p;
            } else break;
        }
    }

    _sinkDown(i) {
        const d = this._data;
        const n = d.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < n && d[l].f < d[smallest].f) smallest = l;
            if (r < n && d[r].f < d[smallest].f) smallest = r;
            if (smallest !== i) {
                [d[i], d[smallest]] = [d[smallest], d[i]];
                i = smallest;
            } else break;
        }
    }
}
