// ============================================================
// SteadyPath — Warehouse Renderer
// ============================================================
// Renders the warehouse environment on a Canvas: boundaries,
// obstacles, roads, loading zones, blockages, grid, and goal.
// ============================================================

import { COLORS, WAREHOUSE, VEHICLE_CONFIG } from '../config/config.js';

export class WarehouseRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render the full warehouse environment.
     * @param {import('../map/warehouseMap.js').WarehouseMap} map
     * @param {number} scale — pixels per meter
     * @param {number} ox — x offset in pixels
     * @param {number} oy — y offset in pixels
     * @param {{x: number, y: number}|null} goal
     * @param {boolean} showGrid
     */
    render(map, scale, ox, oy, goal, showGrid = false) {
        const ctx = this.ctx;

        // ── Warehouse background ────────────────────────────
        ctx.fillStyle = COLORS.warehouseBg;
        ctx.fillRect(ox, oy, map.width * scale, map.height * scale);

        // ── Grid ────────────────────────────────────────────
        if (showGrid) {
            this._drawGrid(map, scale, ox, oy);
        }

        // ── Loading zones ───────────────────────────────────
        for (const zone of map.loadingZones) {
            this._drawRect(zone, scale, ox, oy, COLORS.loadingZone, COLORS.loadingZoneBorder, 1);
            // Label
            const cx = ox + (zone.x + zone.width / 2) * scale;
            const cy = oy + (map.height - zone.y - zone.height / 2) * scale;
            ctx.fillStyle = COLORS.loadingZoneBorder;
            ctx.font = `${Math.max(10, scale * 0.6)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.label || 'Load', cx, cy);
        }

        // ── Restricted zones ────────────────────────────────
        for (const zone of map.restrictedZones) {
            this._drawRect(zone, scale, ox, oy, COLORS.restrictedZone, COLORS.restrictedZoneBorder, 1);
        }

        // ── Static obstacles ────────────────────────────────
        for (const obs of map.staticObstacles) {
            let fill, stroke;
            switch (obs.type) {
                case 'rack':
                    fill = COLORS.rack; stroke = '#6b4f2e'; break;
                case 'wall':
                    fill = COLORS.wall; stroke = '#70758a'; break;
                case 'pillar':
                    fill = COLORS.pillar; stroke = '#8a90a5'; break;
                default:
                    fill = COLORS.wall; stroke = '#555'; break;
            }
            this._drawRect(obs, scale, ox, oy, fill, stroke, 2);

            // Rack label
            if (obs.type === 'rack') {
                const cx = ox + (obs.x + obs.width / 2) * scale;
                const cy = oy + (map.height - obs.y - obs.height / 2) * scale;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = `${Math.max(9, scale * 0.5)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(obs.id.replace('rack_', 'R'), cx, cy);
            }
        }

        // ── Dynamic blockages ───────────────────────────────
        for (const obs of map.dynamicObstacles.getAll()) {
            this._drawRect(obs, scale, ox, oy, 'rgba(255,82,82,0.35)', COLORS.blockage, 2);
            // 🚧 icon
            const cx = ox + (obs.x + obs.width / 2) * scale;
            const cy = oy + (map.height - obs.y - obs.height / 2) * scale;
            ctx.font = `${Math.max(14, scale * 0.8)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚧', cx, cy);
        }

        // ── Warehouse border ────────────────────────────────
        ctx.strokeStyle = COLORS.warehouseBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, map.width * scale, map.height * scale);

        // ── Goal marker ─────────────────────────────────────
        if (goal) {
            const gx = ox + goal.x * scale;
            const gy = oy + (map.height - goal.y) * scale;

            // Pulsing glow
            ctx.beginPath();
            ctx.arc(gx, gy, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,215,64,0.25)';
            ctx.fill();

            // Inner marker
            ctx.beginPath();
            ctx.arc(gx, gy, 6, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.goal;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.fillStyle = COLORS.goal;
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL', gx, gy - 14);
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    _drawRect(obs, scale, ox, oy, fill, stroke, lineWidth) {
        const ctx = this.ctx;
        const x = ox + obs.x * scale;
        const y = oy + (WAREHOUSE.height - obs.y - obs.height) * scale;
        const w = obs.width * scale;
        const h = obs.height * scale;

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);
    }

    _drawGrid(map, scale, ox, oy) {
        const ctx = this.ctx;
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;

        for (let c = 0; c <= map.gridCols; c++) {
            const x = ox + c * map.resolution * scale;
            ctx.beginPath();
            ctx.moveTo(x, oy);
            ctx.lineTo(x, oy + map.height * scale);
            ctx.stroke();
        }
        for (let r = 0; r <= map.gridRows; r++) {
            const y = oy + r * map.resolution * scale;
            ctx.beginPath();
            ctx.moveTo(ox, y);
            ctx.lineTo(ox + map.width * scale, y);
            ctx.stroke();
        }
    }
}
