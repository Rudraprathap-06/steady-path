// ============================================================
// SteadyPath — Master 3D Warehouse Scene Manager
// ============================================================
// Orchestrates Three.js rendering, lighting, camera perspectives,
// interactive raycasting, cursor reticle, and 3D submodules.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WAREHOUSE } from '../config/config.js';
import { worldToThree, threeToWorld, HALF_WIDTH, HALF_HEIGHT } from './coords3d.js';
import { WarehouseMeshBuilder } from './warehouseMeshBuilder.js';
import { Vehicle3D } from './vehicle3d.js';
import { Path3D } from './path3d.js';
import { Blockage3D } from './blockage3d.js';

export class ThreeWarehouseScene {
    /**
     * @param {HTMLElement} container
     * @param {import('../simulation/simulationEngine.js').SimulationEngine} engine
     * @param {import('../simulation/simulationController.js').SimulationController} controller
     */
    constructor(container, engine, controller) {
        this.container = container;
        this.engine = engine;
        this.controller = controller;

        this.viewMode = 'orbit'; // 'orbit' | 'topdown' | 'follow' | 'firstperson' | 'isometric'
        this.showGrid = true;

        this._initScene();
        this._initCamera();
        this._initRenderer();
        this._initControls();
        this._initLighting();
        this._initFloorGrid();
        this._initReticle();
        this._initInteraction();

        // 3D Submodules
        this.meshBuilder = new WarehouseMeshBuilder();
        this.vehicle3D = new Vehicle3D();
        this.path3D = new Path3D();
        this.blockage3D = new Blockage3D();

        this.scene.add(this.meshBuilder.build(this.engine.map));
        this.scene.add(this.vehicle3D.group);
        this.scene.add(this.path3D.group);
        this.scene.add(this.blockage3D.group);

        this._clock = new THREE.Clock();
        this._handleResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._handleResize);
        this._handleResize();
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c10);
        this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.018);
    }

    _initCamera() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);

        // Default: Angled high isometric vantage
        this.camera.position.set(0, 24, 22);
        this.camera.lookAt(0, 0, 0);

        // Smooth camera transition state
        this._targetCamPos = new THREE.Vector3().copy(this.camera.position);
        this._targetLookAt = new THREE.Vector3(0, 0, 0);
    }

    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;

        this.canvas = this.renderer.domElement;
        this.canvas.id = 'three-canvas';
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
    }

    _initControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera dipping below floor
        this.controls.minDistance = 3.0;
        this.controls.maxDistance = 55.0;
        this.controls.target.set(0, 0, 0);
    }

    _initLighting() {
        // Soft ambient illumination
        const ambient = new THREE.AmbientLight(0xdbe4f0, 0.5);
        this.scene.add(ambient);

        // Directional Sun / Skylight casting soft shadows
        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.4);
        this.sunLight.position.set(12, 28, 10);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 70;
        this.sunLight.shadow.camera.left = -22;
        this.sunLight.shadow.camera.right = 22;
        this.sunLight.shadow.camera.top = 16;
        this.sunLight.shadow.camera.bottom = -16;
        this.sunLight.shadow.bias = -0.0004;
        this.scene.add(this.sunLight);

        // Cool fill light from opposite angle
        const fillLight = new THREE.DirectionalLight(0x5075a0, 0.55);
        fillLight.position.set(-16, 20, -12);
        this.scene.add(fillLight);
    }

    _initFloorGrid() {
        // Floor navigation grid (0.5m resolution)
        const gridHelper = new THREE.GridHelper(30, 60, 0x00e5ff, 0x223048);
        gridHelper.position.y = 0.012;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.35;
        this.gridMesh = gridHelper;
        this.scene.add(this.gridMesh);
    }

    _initReticle() {
        // Holographic 3D floor reticle tracking under mouse
        this.reticleGroup = new THREE.Group();
        this.reticleGroup.name = 'FloorReticle';

        const outerRingGeo = new THREE.RingGeometry(0.55, 0.62, 32);
        this.reticleMat = new THREE.MeshBasicMaterial({
            color: 0xffd740,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
        });
        const outerRing = new THREE.Mesh(outerRingGeo, this.reticleMat);
        outerRing.rotation.x = -Math.PI / 2;
        this.reticleGroup.add(outerRing);

        const innerDotGeo = new THREE.CircleGeometry(0.12, 16);
        const innerDot = new THREE.Mesh(innerDotGeo, this.reticleMat);
        innerDot.rotation.x = -Math.PI / 2;
        this.reticleGroup.add(innerDot);

        this.reticleGroup.position.set(0, 0.03, 0);
        this.reticleGroup.visible = false;
        this.scene.add(this.reticleGroup);
    }

    // ── Mouse & Click Raycasting ──────────────────────────────

    _initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-999, -999);
        this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0

        this._pointerDownPos = { x: 0, y: 0 };
        this._isHoveringFloor = false;

        this.canvas.addEventListener('pointerdown', (e) => {
            this._pointerDownPos = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('pointermove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this._updateRaycast(e);
        });

        this.canvas.addEventListener('pointerleave', () => {
            this.reticleGroup.visible = false;
            this._isHoveringFloor = false;
        });

        this.canvas.addEventListener('pointerup', (e) => {
            // Check if pointer dragged or clicked
            const dx = e.clientX - this._pointerDownPos.x;
            const dy = e.clientY - this._pointerDownPos.y;
            const dist = Math.hypot(dx, dy);

            // Only count as click if user didn't drag to orbit the camera (< 6px)
            if (dist < 6) {
                this._handleClick(e);
            }
        });
    }

    _updateRaycast(e) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        const hit = this.raycaster.ray.intersectPlane(this.floorPlane, intersectPoint);

        const cursorCoordsEl = document.getElementById('cursor-coords');

        if (hit) {
            const world = threeToWorld(intersectPoint.x, intersectPoint.z);
            const isInside = world.x >= 0 && world.x <= WAREHOUSE.width &&
                             world.y >= 0 && world.y <= WAREHOUSE.height;

            if (isInside) {
                this.reticleGroup.position.set(intersectPoint.x, 0.03, intersectPoint.z);
                this.reticleGroup.visible = true;
                this._isHoveringFloor = true;

                // Color code reticle: Gold for Destination, Red for Blockage or Blocked cell
                const isBlocked = this.engine.map.isInsideObstacle(world.x, world.y);
                const isBlockMode = this.controller.mode === 'ADD_BLOCKAGE';

                if (isBlocked || isBlockMode) {
                    this.reticleMat.color.setHex(0xff3d00);
                } else {
                    this.reticleMat.color.setHex(0xffd740);
                }

                if (cursorCoordsEl) {
                    cursorCoordsEl.textContent = `X: ${world.x.toFixed(2)} m, Y: ${world.y.toFixed(2)} m ${isBlocked ? '(Blocked)' : ''}`;
                }
            } else {
                this.reticleGroup.visible = false;
                this._isHoveringFloor = false;
                if (cursorCoordsEl) {
                    cursorCoordsEl.textContent = `Outside bounds (${world.x.toFixed(1)}, ${world.y.toFixed(1)})`;
                }
            }
        } else {
            this.reticleGroup.visible = false;
            this._isHoveringFloor = false;
        }
    }

    _handleClick(e) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        const hit = this.raycaster.ray.intersectPlane(this.floorPlane, intersectPoint);
        if (!hit) return;

        const world = threeToWorld(intersectPoint.x, intersectPoint.z);

        if (!this.engine.map.isInsideBounds(world.x, world.y)) {
            this.engine._log('[3D] Click outside warehouse bounds');
            return;
        }

        if (this.controller.mode === 'SET_DESTINATION') {
            this.controller.handleDestinationClick(world);
        } else if (this.controller.mode === 'ADD_BLOCKAGE') {
            this.controller.handleBlockageClick(world);
        }
    }

    // ── Camera Preset Views ───────────────────────────────────

    setView(mode) {
        this.viewMode = mode;

        if (mode === 'orbit') {
            this.controls.enabled = true;
            this._animateCameraTo(new THREE.Vector3(0, 24, 22), new THREE.Vector3(0, 0, 0));
        } else if (mode === 'topdown') {
            this.controls.enabled = true;
            this._animateCameraTo(new THREE.Vector3(0, 36, 0.001), new THREE.Vector3(0, 0, 0));
        } else if (mode === 'isometric') {
            this.controls.enabled = true;
            this._animateCameraTo(new THREE.Vector3(20, 22, 20), new THREE.Vector3(0, 0, 0));
        } else if (mode === 'follow' || mode === 'firstperson') {
            this.controls.enabled = false;
        }
    }

    _animateCameraTo(pos, target) {
        this._targetCamPos.copy(pos);
        this._targetLookAt.copy(target);
    }

    setGridVisible(visible) {
        this.showGrid = visible;
        if (this.gridMesh) this.gridMesh.visible = visible;
    }

    _handleResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // ── Render & Update Loop ──────────────────────────────────

    render() {
        const dt = Math.min(this._clock.getDelta(), 0.1);
        const elapsedTime = this._clock.getElapsedTime();

        // 1. Update 3D submodules
        this.meshBuilder.update(elapsedTime);
        this.vehicle3D.update(this.engine.vehicle, this.engine.state, dt, elapsedTime);
        this.path3D.update(this.engine.planResult, this.engine.destination, this.engine._waypointIndex);
        this.path3D.animate(elapsedTime);
        this.blockage3D.update(this.engine.map.dynamicObstacles.getAll());
        this.blockage3D.animate(elapsedTime);

        // 2. Animate Reticle pulse
        if (this.reticleGroup.visible) {
            const reticleScale = 1.0 + 0.08 * Math.sin(elapsedTime * 6);
            this.reticleGroup.scale.set(reticleScale, 1, reticleScale);
        }

        // 3. Camera Modes Handling
        const vPos = worldToThree(this.engine.vehicle.x, this.engine.vehicle.y, 0);
        const vHeading = this.engine.vehicle.heading;

        if (this.viewMode === 'follow') {
            // Third-person chase camera smoothly tracking 4.5m behind vehicle
            const distBehind = 5.0;
            const camH = 2.8;

            const targetX = vPos.x - Math.cos(vHeading) * distBehind;
            const targetZ = vPos.z + Math.sin(vHeading) * distBehind; // Three.js Y-up mapping
            const targetY = camH;

            this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.08);
            this.camera.lookAt(vPos.x, 0.8, vPos.z);
        } else if (this.viewMode === 'firstperson') {
            // First-person camera positioned right on the front LiDAR / bumper
            const frontDist = 1.0;
            const eyeY = 0.72;

            const eyeX = vPos.x + Math.cos(vHeading) * frontDist;
            const eyeZ = vPos.z - Math.sin(vHeading) * frontDist;

            this.camera.position.set(eyeX, eyeY, eyeZ);

            const lookDist = 8.0;
            const lookX = eyeX + Math.cos(vHeading) * lookDist;
            const lookZ = eyeZ - Math.sin(vHeading) * lookDist;
            this.camera.lookAt(lookX, eyeY * 0.9, lookZ);
        } else {
            // Orbit, Top-down, Isometric: smoothly interpolate camera position
            if (this._targetCamPos && this.camera.position.distanceTo(this._targetCamPos) > 0.05) {
                this.camera.position.lerp(this._targetCamPos, 0.08);
                this.controls.target.lerp(this._targetLookAt, 0.08);
            }
            this.controls.update();
        }

        // 4. Render WebGL Frame
        this.renderer.render(this.scene, this.camera);
    }
}
