// ============================================================
// SteadyPath — Application Main Entrypoint
// ============================================================

import { WAREHOUSE } from './config/config.js';
import { SimulationEngine, SimState } from './simulation/simulationEngine.js';
import { SimulationController, InteractionMode } from './simulation/simulationController.js';
import { WarehouseRenderer } from './visualization/warehouseRenderer.js';
import { PathRenderer } from './visualization/pathRenderer.js';
import { VehicleRenderer } from './visualization/vehicleRenderer.js';
import { runAllTests } from './tests/testRunner.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');

    const engine = new SimulationEngine();
    const controller = new SimulationController(engine, canvas);

    const warehouseRenderer = new WarehouseRenderer(ctx);
    const pathRenderer = new PathRenderer(ctx);
    const vehicleRenderer = new VehicleRenderer(ctx);

    let scale = 20;
    let offsetX = 20;
    let offsetY = 20;
    let showGrid = true;

    // ── Resize canvas to fit container ──────────────────────
    function handleResize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const padding = 30;

        const availW = Math.max(100, w - padding * 2);
        const availH = Math.max(100, h - padding * 2);

        scale = Math.min(availW / WAREHOUSE.width, availH / WAREHOUSE.height);
        offsetX = (w - WAREHOUSE.width * scale) / 2;
        offsetY = (h - WAREHOUSE.height * scale) / 2;

        controller.setTransform(scale, offsetX, offsetY);
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // ── Mouse coordinate tracking ───────────────────────────
    const cursorCoordsEl = document.getElementById('cursor-coords');
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const world = controller.canvasToWorld(cx, cy);
        if (cursorCoordsEl) {
            if (world.x >= 0 && world.x <= WAREHOUSE.width && world.y >= 0 && world.y <= WAREHOUSE.height) {
                cursorCoordsEl.textContent = `X: ${world.x.toFixed(2)} m, Y: ${world.y.toFixed(2)} m`;
            } else {
                cursorCoordsEl.textContent = `Outside bounds (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`;
            }
        }
    });

    // ── UI Elements ─────────────────────────────────────────
    const modeIndicator = document.getElementById('mode-indicator');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    const btnModeDest = document.getElementById('btn-mode-dest');
    const btnModeBlock = document.getElementById('btn-mode-block');

    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnReset = document.getElementById('btn-reset');
    const btnPlan = document.getElementById('btn-plan');
    const btnReplan = document.getElementById('btn-replan');
    const btnClearBlocks = document.getElementById('btn-clear-blocks');
    const btnRandomDest = document.getElementById('btn-random-dest');
    const btnRunTests = document.getElementById('btn-run-tests');
    const gridToggle = document.getElementById('grid-toggle');

    // Telemetry Elements
    const valState = document.getElementById('val-state');
    const valPos = document.getElementById('val-pos');
    const valHeading = document.getElementById('val-heading');
    const valVelocity = document.getElementById('val-velocity');
    const valDest = document.getElementById('val-dest');
    const valPathLength = document.getElementById('val-path-length');
    const valProgress = document.getElementById('val-progress');
    const valPlanningTime = document.getElementById('val-planning-time');
    const logContainer = document.getElementById('log-container');

    // ── Mode Switchers ──────────────────────────────────────
    function updateModeUI() {
        if (controller.mode === InteractionMode.SET_DESTINATION) {
            btnModeDest.classList.add('active');
            btnModeBlock.classList.remove('active');
            modeIndicator.className = 'mode-indicator destination';
            modeIndicator.textContent = 'Mode: Set Destination (Click Canvas)';
        } else {
            btnModeDest.classList.remove('active');
            btnModeBlock.classList.add('active');
            modeIndicator.className = 'mode-indicator blockage';
            modeIndicator.textContent = 'Mode: Add Blockage (Click Road)';
        }
    }

    btnModeDest.addEventListener('click', () => {
        controller.setModeDestination();
        updateModeUI();
    });

    btnModeBlock.addEventListener('click', () => {
        controller.setModeBlockage();
        updateModeUI();
    });

    // ── Buttons ─────────────────────────────────────────────
    btnStart.addEventListener('click', () => controller.start());
    btnPause.addEventListener('click', () => controller.pause());
    btnResume.addEventListener('click', () => controller.resume());
    btnReset.addEventListener('click', () => controller.reset());
    btnPlan.addEventListener('click', () => controller.planRoute());
    btnReplan.addEventListener('click', () => controller.replanNow());
    btnClearBlocks.addEventListener('click', () => controller.clearBlockages());
    btnRandomDest.addEventListener('click', () => controller.randomDestination());

    btnRunTests.addEventListener('click', () => {
        engine._log('[UI] Running automated test suite...');
        runAllTests((msg) => engine._log(msg));
    });

    gridToggle.addEventListener('change', (e) => {
        showGrid = e.target.checked;
    });

    // ── Update Telemetry & Logs on Engine Change ────────────
    let lastLogCount = 0;
    engine.onUpdate((sim) => {
        // State and status dot
        valState.textContent = sim.state;
        statusText.textContent = sim.state;
        statusDot.className = 'status-dot';
        if (sim.state === SimState.MOVING) statusDot.classList.add('active');
        else if (sim.state === SimState.PLANNING || sim.state === SimState.REPLANNING) statusDot.classList.add('planning');
        else if (sim.state === SimState.BLOCKED || sim.state === SimState.PAUSED) statusDot.classList.add('warning');
        else if (sim.state === SimState.NO_PATH) statusDot.classList.add('error');

        // Vehicle info
        valPos.textContent = `(${sim.vehicle.x.toFixed(1)}, ${sim.vehicle.y.toFixed(1)})`;
        const deg = (sim.vehicle.heading * 180 / Math.PI) % 360;
        valHeading.textContent = `${deg.toFixed(0)}° (${sim.vehicle.heading.toFixed(2)} rad)`;
        valVelocity.textContent = `${sim.vehicle.velocity.toFixed(2)} m/s`;

        // Destination & Path
        if (sim.destination) {
            valDest.textContent = `(${sim.destination.x.toFixed(1)}, ${sim.destination.y.toFixed(1)})`;
        } else {
            valDest.textContent = 'None';
        }

        if (sim.planResult && sim.planResult.success) {
            valPathLength.textContent = `${sim.planResult.metadata.pathLength.toFixed(1)} m`;
            valPlanningTime.textContent = `${sim.planResult.metadata.planningTimeMs.toFixed(1)} ms`;
            const total = sim.planResult.trajectory?.length || 0;
            const current = Math.min(sim._waypointIndex, total);
            valProgress.textContent = `${current} / ${total} wp`;
        } else {
            valPathLength.textContent = '—';
            valPlanningTime.textContent = '—';
            valProgress.textContent = '—';
        }

        // Logs
        if (sim.logs.length !== lastLogCount) {
            lastLogCount = sim.logs.length;
            renderLogs(sim.logs);
        }
    });

    function renderLogs(logs) {
        logContainer.innerHTML = '';
        for (const line of logs.slice(-50)) {
            const div = document.createElement('div');
            div.className = 'log-entry';
            if (line.includes('[PLANNER]')) {
                div.innerHTML = `<span class="planner">${escapeHtml(line)}</span>`;
            } else if (line.includes('[REPLANNER]')) {
                div.innerHTML = `<span class="replanner">${escapeHtml(line)}</span>`;
            } else if (line.includes('[SIM]')) {
                div.innerHTML = `<span class="sim">${escapeHtml(line)}</span>`;
            } else if (line.includes('❌') || line.includes('error') || line.includes('blocked') || line.includes('No valid')) {
                div.innerHTML = `<span class="error">${escapeHtml(line)}</span>`;
            } else {
                div.textContent = line;
            }
            logContainer.appendChild(div);
        }
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Continuous Animation Render Loop ────────────────────
    function loop() {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        warehouseRenderer.render(engine.map, scale, offsetX, offsetY, engine.destination, showGrid);
        pathRenderer.render(engine.planResult, scale, offsetX, offsetY, engine._waypointIndex);
        vehicleRenderer.render(engine.vehicle, scale, offsetX, offsetY);

        requestAnimationFrame(loop);
    }

    updateModeUI();
    engine._log('[SIM] SteadyPath initialized at (2.0, 2.0)');
    engine._log('[SIM] Click on the warehouse to set a destination');
    loop();
});
