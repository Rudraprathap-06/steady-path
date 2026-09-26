// ============================================================
// SteadyPath — Simulation Controller
// ============================================================
// Connects UI events (clicks, buttons) to the SimulationEngine.
// Manages canvas coordinate conversion and interaction modes.
// ============================================================

import { SimulationEngine, SimState } from './simulationEngine.js';
import { WAREHOUSE } from '../config/config.js';

/**
 * Interaction modes.
 */
export const InteractionMode = {
    SET_DESTINATION: 'SET_DESTINATION',
    ADD_BLOCKAGE: 'ADD_BLOCKAGE',
};

export class SimulationController {
    /**
     * @param {SimulationEngine} engine
     * @param {HTMLCanvasElement} canvas
     */
    constructor(engine, canvas) {
        this.engine = engine;
        this.canvas = canvas;
        this.mode = InteractionMode.SET_DESTINATION;

        // Canvas ↔ world transform (set by renderer)
        this._scale = 1;
        this._offsetX = 0;
        this._offsetY = 0;

        this._setupCanvasClick();
    }

    /**
     * Update the canvas→world transform (called by the renderer each frame).
     */
    setTransform(scale, offsetX, offsetY) {
        this._scale = scale;
        this._offsetX = offsetX;
        this._offsetY = offsetY;
    }

    /**
     * Convert canvas pixel to world coordinates.
     * Note: Y is flipped (canvas Y goes down, world Y goes up).
     */
    canvasToWorld(canvasX, canvasY) {
        const wx = (canvasX - this._offsetX) / this._scale;
        const wy = WAREHOUSE.height - (canvasY - this._offsetY) / this._scale;
        return { x: wx, y: wy };
    }

    _setupCanvasClick() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const world = this.canvasToWorld(cx, cy);

            if (this.mode === InteractionMode.SET_DESTINATION) {
                this._handleDestinationClick(world);
            } else if (this.mode === InteractionMode.ADD_BLOCKAGE) {
                this._handleBlockageClick(world);
            }
        });
    }

    handleDestinationClick(world) {
        if (!this.engine.map.isInsideBounds(world.x, world.y)) {
            this.engine._log('[UI] Click outside warehouse bounds');
            return;
        }
        if (this.engine.map.isInsideObstacle(world.x, world.y)) {
            this.engine._log('[UI] Destination unavailable. Please select a reachable location.');
            return;
        }
        this.engine.setDestination(world.x, world.y);
    }

    handleBlockageClick(world) {
        if (!this.engine.map.isInsideBounds(world.x, world.y)) return;
        // Center blockage on click point
        this.engine.addBlockage(world.x - 0.75, world.y - 0.75, 1.5, 1.5);
    }

    _handleDestinationClick(world) {
        this.handleDestinationClick(world);
    }

    _handleBlockageClick(world) {
        this.handleBlockageClick(world);
    }

    // ── Button Handlers ─────────────────────────────────────

    setModeDestination() {
        this.mode = InteractionMode.SET_DESTINATION;
    }

    setModeBlockage() {
        this.mode = InteractionMode.ADD_BLOCKAGE;
    }

    planRoute() {
        this.engine.planRoute();
    }

    start() {
        this.engine.start();
    }

    pause() {
        this.engine.pause();
    }

    resume() {
        if (this.engine.state === SimState.PAUSED) {
            this.engine.resume();
        } else {
            this.engine.start();
        }
    }

    reset() {
        this.engine.reset();
    }

    clearBlockages() {
        this.engine.clearBlockages();
    }

    replanNow() {
        this.engine.triggerReplan();
    }

    randomDestination() {
        // Find a random free cell
        const map = this.engine.map;
        for (let attempts = 0; attempts < 100; attempts++) {
            const x = 1 + Math.random() * (map.width - 2);
            const y = 1 + Math.random() * (map.height - 2);
            if (map.isValidPosition(x, y)) {
                this.engine.setDestination(x, y);
                return;
            }
        }
        this.engine._log('[UI] Could not find a valid random destination');
    }
}
