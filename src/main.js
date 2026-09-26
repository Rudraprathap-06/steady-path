// ============================================================
// SteadyPath — Application Main Entrypoint (3D Simulation)
// ============================================================

import { WAREHOUSE } from './config/config.js';
import { SimulationEngine, SimState } from './simulation/simulationEngine.js';
import { SimulationController, InteractionMode } from './simulation/simulationController.js';
import { WarehouseRenderer } from './visualization/warehouseRenderer.js';
import { PathRenderer } from './visualization/pathRenderer.js';
import { VehicleRenderer } from './visualization/vehicleRenderer.js';
import { ThreeWarehouseScene } from './visualization3d/threeWarehouseScene.js';
import { runAllTests } from './tests/testRunner.js';

window.addEventListener('DOMContentLoaded', () => {
    // ── Simulation Engine & Controller ──────────────────────
    const canvas2d = document.getElementById('sim-canvas');
    const ctx2d = canvas2d.getContext('2d');
    const webglContainer = document.getElementById('webgl-container');

    const engine = new SimulationEngine();
    const controller = new SimulationController(engine, canvas2d);

    // ── 2D Canvas Renderers (for 2D Plan View mode) ──────────
    const warehouseRenderer = new WarehouseRenderer(ctx2d);
    const pathRenderer = new PathRenderer(ctx2d);
    const vehicleRenderer = new VehicleRenderer(ctx2d);

    // ── 3D WebGL Scene (Primary Simulation View) ────────────
    let threeScene = null;
    let is3DMode = true;
    let showGrid = true;

    try {
        threeScene = new ThreeWarehouseScene(webglContainer, engine, controller);
        threeScene.setGridVisible(showGrid);
    } catch (err) {
        console.error('Failed to initialize Three.js 3D scene:', err);
        is3DMode = false;
        webglContainer.style.display = 'none';
        canvas2d.style.display = 'block';
    }

    // ── 2D Canvas Scaling & Sizing ──────────────────────────
    let scale = 20;
    let offsetX = 20;
    let offsetY = 20;

    function handleResize() {
        if (threeScene && is3DMode) {
            threeScene._handleResize();
        }

        const rect = canvas2d.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas2d.width = rect.width * dpr;
        canvas2d.height = rect.height * dpr;
        ctx2d.resetTransform();
        ctx2d.scale(dpr, dpr);

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

    // ── Mouse coordinate tracking for 2D View ───────────────
    const cursorCoordsEl = document.getElementById('cursor-coords');
    canvas2d.addEventListener('mousemove', (e) => {
        if (is3DMode) return;
        const rect = canvas2d.getBoundingClientRect();
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

    // 3D View & Camera Toolbar Elements
    const btnToggle3D = document.getElementById('btn-toggle-3d');
    const btnToggle2D = document.getElementById('btn-toggle-2d');
    const cameraToolbar = document.getElementById('camera-toolbar');
    const viewportHints = document.getElementById('viewport-hints');
    const panelCamera = document.getElementById('panel-camera');
    const btnCamReset = document.getElementById('btn-cam-reset');

    const camBtns = document.querySelectorAll('.cam-btn[data-view]');
    const sideCamBtns = {
        orbit: document.getElementById('btn-side-cam-orbit'),
        topdown: document.getElementById('btn-side-cam-topdown'),
        follow: document.getElementById('btn-side-cam-follow'),
        firstperson: document.getElementById('btn-side-cam-firstperson'),
    };

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
        const placeTarget = is3DMode ? 'Floor' : 'Canvas';
        if (controller.mode === InteractionMode.SET_DESTINATION) {
            btnModeDest.classList.add('active');
            btnModeBlock.classList.remove('active');
            modeIndicator.className = 'mode-indicator destination';
            modeIndicator.textContent = `Mode: Set Destination (Click ${placeTarget})`;
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

    // ── 3D vs 2D View Switcher ──────────────────────────────
    function setViewMode(mode3d) {
        is3DMode = mode3d;
        if (is3DMode) {
            btnToggle3D.classList.add('active');
            btnToggle2D.classList.remove('active');
            webglContainer.style.display = 'block';
            canvas2d.style.display = 'none';
            if (cameraToolbar) cameraToolbar.style.display = 'flex';
            if (viewportHints) viewportHints.style.display = 'flex';
            if (panelCamera) panelCamera.style.display = 'block';
            if (threeScene) threeScene._handleResize();
        } else {
            btnToggle3D.classList.remove('active');
            btnToggle2D.classList.add('active');
            webglContainer.style.display = 'none';
            canvas2d.style.display = 'block';
            if (cameraToolbar) cameraToolbar.style.display = 'none';
            if (viewportHints) viewportHints.style.display = 'none';
            if (panelCamera) panelCamera.style.display = 'none';
            handleResize();
        }
        updateModeUI();
    }

    if (btnToggle3D && btnToggle2D) {
        btnToggle3D.addEventListener('click', () => setViewMode(true));
        btnToggle2D.addEventListener('click', () => setViewMode(false));
    }

    // ── Camera Vantage Controls ─────────────────────────────
    function activateCameraView(viewName) {
        if (!threeScene) return;
        threeScene.setView(viewName);

        // Update toolbar buttons
        camBtns.forEach((btn) => {
            if (btn.dataset.view === viewName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update sidebar buttons
        Object.keys(sideCamBtns).forEach((key) => {
            if (sideCamBtns[key]) {
                if (key === viewName) sideCamBtns[key].classList.add('active');
                else sideCamBtns[key].classList.remove('active');
            }
        });
    }

    camBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            activateCameraView(btn.dataset.view);
        });
    });

    Object.keys(sideCamBtns).forEach((viewKey) => {
        const btn = sideCamBtns[viewKey];
        if (btn) {
            btn.addEventListener('click', () => activateCameraView(viewKey));
        }
    });

    if (btnCamReset) {
        btnCamReset.addEventListener('click', () => {
            activateCameraView('orbit');
        });
    }

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
        if (threeScene) {
            threeScene.setGridVisible(showGrid);
        }
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
            } else if (line.includes('[SIM]') || line.includes('[3D]')) {
                div.innerHTML = `<span class="sim">${escapeHtml(line)}</span>`;
            } else if (line.includes('❌') || line.includes('error') || line.includes('blocked') || line.includes('No valid') || line.includes('Blockage detected')) {
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

    // ── Continuous Animation & Render Loop ──────────────────
    function loop() {
        requestAnimationFrame(loop);

        if (is3DMode && threeScene) {
            threeScene.render();
        } else if (!is3DMode) {
            const rect = canvas2d.getBoundingClientRect();
            ctx2d.clearRect(0, 0, rect.width, rect.height);

            warehouseRenderer.render(engine.map, scale, offsetX, offsetY, engine.destination, showGrid);
            pathRenderer.render(engine.planResult, scale, offsetX, offsetY, engine._waypointIndex);
            vehicleRenderer.render(engine.vehicle, scale, offsetX, offsetY);
        }
    }

    updateModeUI();
    engine._log('[SIM] SteadyPath 3D initialized at (2.0, 2.0)');
    engine._log('[SIM] Click on the warehouse floor to set a destination');
    loop();
});
