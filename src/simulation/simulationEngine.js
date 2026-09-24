// ============================================================
// SteadyPath — Simulation Engine
// ============================================================
// Core simulation loop: manages state, vehicle movement along
// trajectory, blockage detection, and replanning triggers.
// ============================================================

import { SIMULATION_CONFIG } from '../config/config.js';
import { WarehouseMap } from '../map/warehouseMap.js';
import { VehicleState } from '../vehicle/vehicleState.js';
import { plan, replan, isCurrentPathBlocked } from '../interface/plannerInterface.js';

/**
 * Simulation states.
 */
export const SimState = {
    IDLE: 'IDLE',
    PLANNING: 'PLANNING',
    MOVING: 'MOVING',
    PAUSED: 'PAUSED',
    REPLANNING: 'REPLANNING',
    BLOCKED: 'BLOCKED',
    NO_PATH: 'NO_PATH',
    ARRIVED: 'ARRIVED',
};

export class SimulationEngine {
    constructor() {
        this.map = new WarehouseMap();
        this.vehicle = new VehicleState();

        this.state = SimState.IDLE;
        this.destination = null;
        this.planResult = null;

        // Current trajectory following
        this._trajectoryIndex = 0;
        this._waypointIndex = 0;

        // Animation
        this._animFrameId = null;
        this._lastTime = 0;

        // Listeners
        this._listeners = [];

        // Log messages
        this.logs = [];
    }

    // ── Event System ────────────────────────────────────────

    /**
     * Register a listener called on every state change / update.
     * @param {Function} fn
     */
    onUpdate(fn) {
        this._listeners.push(fn);
    }

    _notify() {
        for (const fn of this._listeners) fn(this);
    }

    _log(msg) {
        this.logs.push(msg);
        if (this.logs.length > 200) this.logs.shift();
        console.log(msg);
    }

    // ── Destination & Planning ──────────────────────────────

    /**
     * Set a destination and plan a route.
     * @param {number} x — meters
     * @param {number} y — meters
     */
    setDestination(x, y) {
        this.destination = { x, y };
        this._log(`[SIM] Destination set: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        this.planRoute();
    }

    /**
     * Plan (or re-plan) the route from the vehicle's current position.
     */
    planRoute() {
        if (!this.destination) {
            this._log('[SIM] No destination set');
            return;
        }

        this.state = SimState.PLANNING;
        this._notify();

        const result = plan(this.vehicle.getState(), this.destination, this.map);
        this.planResult = result;

        if (result.success) {
            this.state = SimState.IDLE;
            this._waypointIndex = 0;
            this._log(`[SIM] Route planned — ${result.metadata.pathLength.toFixed(1)} m, ${result.metadata.planningTimeMs.toFixed(1)} ms`);
        } else {
            this.state = SimState.NO_PATH;
            this._log(`[SIM] ${result.reason || 'No valid route exists.'}`);
        }
        this._notify();
    }

    /**
     * Trigger dynamic replanning.
     */
    triggerReplan() {
        if (!this.destination) return;

        this.state = SimState.REPLANNING;
        this._notify();

        const result = replan(this.vehicle.getState(), this.destination, this.map);
        this.planResult = result;

        if (result.success) {
            this._waypointIndex = 0;
            this.state = SimState.MOVING;
            this._log('[SIM] Replanned — vehicle continuing on alternate route');
        } else {
            this.state = SimState.NO_PATH;
            this._log('[SIM] No alternate route available');
        }
        this._notify();
    }

    // ── Simulation Controls ─────────────────────────────────

    start() {
        if (!this.planResult || !this.planResult.success) {
            this._log('[SIM] Cannot start — no valid route');
            return;
        }
        if (this.state === SimState.MOVING) return;

        this.state = SimState.MOVING;
        this._lastTime = performance.now();
        this._log('[SIM] Simulation started');
        this._notify();
        this._tick();
    }

    pause() {
        if (this.state !== SimState.MOVING) return;
        this.state = SimState.PAUSED;
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        this._log('[SIM] Paused');
        this._notify();
    }

    resume() {
        if (this.state !== SimState.PAUSED) return;
        this.state = SimState.MOVING;
        this._lastTime = performance.now();
        this._log('[SIM] Resumed');
        this._notify();
        this._tick();
    }

    reset() {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        this.vehicle.reset();
        this.state = SimState.IDLE;
        this.destination = null;
        this.planResult = null;
        this._waypointIndex = 0;
        this.map.dynamicObstacles.clearAll();
        this._log('[SIM] Reset');
        this._notify();
    }

    // ── Main Loop ───────────────────────────────────────────

    _tick() {
        if (this.state !== SimState.MOVING) return;

        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.05); // cap at 50ms
        this._lastTime = now;

        this._updateVehicle(dt);
        this._notify();

        this._animFrameId = requestAnimationFrame(() => this._tick());
    }

    _updateVehicle(dt) {
        const traj = this.planResult?.trajectory;
        if (!traj || traj.length === 0) return;

        // ── Check for blockages ahead ───────────────────────
        if (this.planResult.path && this.planResult.path.length > 0) {
            const pathCheckStart = Math.max(0, this._waypointIndex - 1);
            const { blocked } = isCurrentPathBlocked(this.planResult.path, this.map, pathCheckStart);
            if (blocked) {
                this._log('[SIM] Blockage detected on current route!');
                this.triggerReplan();
                return;
            }
        }

        // ── Follow trajectory ───────────────────────────────
        if (this._waypointIndex >= traj.length) {
            this.state = SimState.ARRIVED;
            this.vehicle.velocity = 0;
            this._log('[SIM] Vehicle arrived at destination');
            if (this._animFrameId) {
                cancelAnimationFrame(this._animFrameId);
                this._animFrameId = null;
            }
            return;
        }

        const target = traj[this._waypointIndex];
        const speed = target.desiredSpeed > 0 ? target.desiredSpeed : SIMULATION_CONFIG.followSpeed;
        const remaining = this.vehicle.moveToward(target, speed, dt);

        if (remaining <= SIMULATION_CONFIG.waypointReachThreshold) {
            this._waypointIndex++;
        }
    }

    // ── Blockage Management ─────────────────────────────────

    /**
     * Add a blockage at world coordinates.
     * @param {number} x
     * @param {number} y
     * @param {number} [w=1.5]
     * @param {number} [h=1.5]
     * @returns {string} blockage ID
     */
    addBlockage(x, y, w, h) {
        const id = this.map.dynamicObstacles.addBlockage(x, y, w, h);
        this._log(`[SIM] Blockage added at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        this._notify();
        return id;
    }

    removeBlockage(id) {
        this.map.dynamicObstacles.removeBlockage(id);
        this._notify();
    }

    clearBlockages() {
        this.map.dynamicObstacles.clearAll();
        this._log('[SIM] All blockages cleared');
        this._notify();
    }
}
