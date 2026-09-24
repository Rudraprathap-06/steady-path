// ============================================================
// SteadyPath — Vehicle Renderer
// ============================================================
// Renders the vehicle body, heading indicator, and labels.
// ============================================================

import { COLORS, VEHICLE_CONFIG, WAREHOUSE } from '../config/config.js';

export class VehicleRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render the vehicle.
     * @param {import('../vehicle/vehicleState.js').VehicleState} vehicle
     * @param {number} scale — pixels per meter
     * @param {number} ox
     * @param {number} oy
     */
    render(vehicle, scale, ox, oy) {
        const ctx = this.ctx;
        const px = ox + vehicle.x * scale;
        const py = oy + (WAREHOUSE.height - vehicle.y) * scale;
        const heading = -vehicle.heading; // canvas Y flipped

        const vw = VEHICLE_CONFIG.length * scale;
        const vh = VEHICLE_CONFIG.width * scale;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(heading);

        // ── Glow ────────────────────────────────────────────
        ctx.shadowColor = COLORS.vehicle;
        ctx.shadowBlur = 12;

        // ── Vehicle body ────────────────────────────────────
        ctx.fillStyle = COLORS.vehicle;
        ctx.globalAlpha = 0.85;
        const rx = 3; // rounded corners
        this._roundRect(-vw / 2, -vh / 2, vw, vh, rx);
        ctx.fill();

        ctx.shadowBlur = 0;

        // ── Heading arrow ───────────────────────────────────
        ctx.fillStyle = COLORS.vehicleHeading;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        const arrowLen = vw * 0.45;
        ctx.moveTo(vw / 2 + arrowLen * 0.3, 0);
        ctx.lineTo(vw / 2 - arrowLen * 0.15, -vh * 0.35);
        ctx.lineTo(vw / 2 - arrowLen * 0.15, vh * 0.35);
        ctx.closePath();
        ctx.fill();

        // ── Front indicator line ────────────────────────────
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(vw / 2, -vh / 2);
        ctx.lineTo(vw / 2, vh / 2);
        ctx.stroke();

        ctx.restore();

        // ── Label (coordinates + velocity) ──────────────────
        ctx.fillStyle = COLORS.text;
        ctx.globalAlpha = 0.8;
        ctx.font = '10px Inter, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `(${vehicle.x.toFixed(1)}, ${vehicle.y.toFixed(1)})`,
            px, py + vh / 2 + 14
        );
        ctx.globalAlpha = 1;
    }

    /**
     * Draw a rounded rectangle path.
     */
    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
