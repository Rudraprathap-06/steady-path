// ============================================================
// SteadyPath — Path Renderer
// ============================================================
// Renders raw A* path, smoothed path, and replanned route
// on the Canvas with distinct visual styles.
// ============================================================

import { COLORS, WAREHOUSE } from '../config/config.js';

export class PathRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render all path layers.
     * @param {import('../interface/plannerInterface.js').PlannerResult|null} planResult
     * @param {number} scale
     * @param {number} ox
     * @param {number} oy
     * @param {number} waypointIndex — current progress index
     */
    render(planResult, scale, ox, oy, waypointIndex = 0) {
        if (!planResult || !planResult.success) return;

        // ── Raw A* path (dashed cyan) ───────────────────────
        if (planResult.rawPath && planResult.rawPath.length > 1) {
            this._drawPath(planResult.rawPath, scale, ox, oy, COLORS.rawPath, 1.5, [6, 4], 0.4);
        }

        // ── Smoothed / final path ───────────────────────────
        const isReplanned = planResult.metadata?.replanned;
        const pathColor = isReplanned ? COLORS.replannedPath : COLORS.smoothedPath;
        if (planResult.path && planResult.path.length > 1) {
            this._drawPath(planResult.path, scale, ox, oy, pathColor, 2.5, [], 0.85);
        }

        // ── Trajectory direction arrows ─────────────────────
        if (planResult.trajectory && planResult.trajectory.length > 1) {
            this._drawTrajectoryArrows(planResult.trajectory, scale, ox, oy, pathColor, waypointIndex);
        }
    }

    // ── Draw a polyline path ────────────────────────────────

    _drawPath(path, scale, ox, oy, color, lineWidth, dash, alpha) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const px = ox + path[i].x * scale;
            const py = oy + (WAREHOUSE.height - path[i].y) * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── Small direction arrows along trajectory ─────────────

    _drawTrajectoryArrows(trajectory, scale, ox, oy, color, waypointIndex) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;

        const step = Math.max(1, Math.floor(trajectory.length / 20)); // ~20 arrows max
        for (let i = waypointIndex; i < trajectory.length; i += step) {
            const t = trajectory[i];
            const px = ox + t.x * scale;
            const py = oy + (WAREHOUSE.height - t.y) * scale;
            const heading = -t.heading; // canvas Y is flipped

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(heading);

            // Small triangle arrow
            const sz = Math.max(3, scale * 0.15);
            ctx.beginPath();
            ctx.moveTo(sz, 0);
            ctx.lineTo(-sz * 0.6, -sz * 0.5);
            ctx.lineTo(-sz * 0.6, sz * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();
    }
}
