// ============================================================
// SteadyPath — Vehicle State
// ============================================================
// Manages the vehicle's kinematic state: x, y, heading, velocity.
// ============================================================

import { SIMULATION_CONFIG } from '../config/config.js';

export class VehicleState {
    constructor() {
        this.x = SIMULATION_CONFIG.vehicleStartX;
        this.y = SIMULATION_CONFIG.vehicleStartY;
        this.heading = SIMULATION_CONFIG.vehicleStartHeading;
        this.velocity = 0;
    }

    /**
     * Reset vehicle to starting position.
     */
    reset() {
        this.x = SIMULATION_CONFIG.vehicleStartX;
        this.y = SIMULATION_CONFIG.vehicleStartY;
        this.heading = SIMULATION_CONFIG.vehicleStartHeading;
        this.velocity = 0;
    }

    /**
     * Get a snapshot of the current state.
     * @returns {{x: number, y: number, heading: number, velocity: number}}
     */
    getState() {
        return {
            x: this.x,
            y: this.y,
            heading: this.heading,
            velocity: this.velocity,
        };
    }

    /**
     * Set state from a snapshot.
     * @param {{x: number, y: number, heading: number, velocity: number}} state
     */
    setState(state) {
        this.x = state.x;
        this.y = state.y;
        this.heading = state.heading;
        this.velocity = state.velocity;
    }

    /**
     * Move vehicle toward a target waypoint at given speed.
     * @param {{x: number, y: number, heading: number}} target
     * @param {number} speed — m/s
     * @param {number} dt — seconds
     * @returns {number} Remaining distance to target
     */
    moveToward(target, speed, dt) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.001) {
            this.heading = target.heading;
            this.velocity = 0;
            return 0;
        }

        const step = speed * dt;
        if (step >= dist) {
            // Arrive at waypoint
            this.x = target.x;
            this.y = target.y;
            this.heading = target.heading;
            this.velocity = speed;
            return 0;
        }

        // Move fraction
        const ratio = step / dist;
        this.x += dx * ratio;
        this.y += dy * ratio;
        this.heading = Math.atan2(dy, dx);
        this.velocity = speed;
        return dist - step;
    }
}
