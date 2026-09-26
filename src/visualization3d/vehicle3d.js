// ============================================================
// SteadyPath — 3D Autonomous Vehicle (AGV / AMR) Model
// ============================================================
// Realistic autonomous mobile robot with:
// - Precision dimensions (2.0m length x 1.2m width x 0.65m height)
// - Dual drive wheels with velocity-synchronized rolling animation
// - Caster wheels and heavy-duty chassis with neon accent trims
// - Top-mounted spinning 3D LiDAR sensor puck with laser fan glow
// - Flashing amber safety beacon & high-intensity forward LED headlights
// - Billboarded holographic telemetry HUD hovering above vehicle
// ============================================================

import * as THREE from 'three';
import { VEHICLE_CONFIG } from '../config/config.js';
import { worldToThree } from './coords3d.js';

export class Vehicle3D {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'AutonomousVehicle3D';

        this.length = VEHICLE_CONFIG.length; // 2.0m along X
        this.width = VEHICLE_CONFIG.width;   // 1.2m along Z
        this.height = 0.55;                  // Chassis height
        this.wheelRadius = 0.22;             // meters

        this.wheels = [];
        this.lidarHead = null;
        this.beaconLight = null;
        this.beaconMesh = null;
        this.headlightLeft = null;
        this.headlightRight = null;
        this.hudSprite = null;
        this.hudCanvas = null;
        this.hudCtx = null;
        this.hudTexture = null;

        this._lidarAngle = 0;
        this._wheelAngle = 0;
        this._lastVelocity = 0;
        this._lastHeading = 0;

        this._buildModel();
        this._buildHud();
    }

    _buildModel() {
        // Base vehicle body group (centered at vehicle center)
        const bodyGroup = new THREE.Group();
        bodyGroup.position.set(0, this.wheelRadius + 0.05, 0);

        // ── Main Chassis Body ───────────────────────────────
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x181e28, // Dark industrial metallic slate
            roughness: 0.35,
            metalness: 0.8,
        });

        // Main body box
        const chassisGeo = new THREE.BoxGeometry(this.length * 0.94, this.height, this.width * 0.92);
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.set(0, this.height / 2, 0);
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        bodyGroup.add(chassis);

        // Front bumper (safety yellow with beveled profile)
        const bumperMat = new THREE.MeshStandardMaterial({
            color: 0xffb300,
            roughness: 0.4,
            metalness: 0.3,
        });
        const frontBumperGeo = new THREE.BoxGeometry(0.18, this.height * 0.7, this.width * 0.94);
        const frontBumper = new THREE.Mesh(frontBumperGeo, bumperMat);
        frontBumper.position.set(this.length * 0.47, this.height * 0.4, 0);
        frontBumper.castShadow = true;
        bodyGroup.add(frontBumper);

        // Rear bumper
        const rearBumperGeo = new THREE.BoxGeometry(0.14, this.height * 0.7, this.width * 0.94);
        const rearBumper = new THREE.Mesh(rearBumperGeo, bumperMat);
        rearBumper.position.set(-this.length * 0.47, this.height * 0.4, 0);
        rearBumper.castShadow = true;
        bodyGroup.add(rearBumper);

        // ── Neon Cyan Accent Strips (Left & Right Sides) ────
        const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const stripGeo = new THREE.BoxGeometry(this.length * 0.82, 0.04, 0.03);

        const leftStrip = new THREE.Mesh(stripGeo, neonCyanMat);
        leftStrip.position.set(0, this.height * 0.65, this.width * 0.465);
        bodyGroup.add(leftStrip);

        const rightStrip = new THREE.Mesh(stripGeo, neonCyanMat);
        rightStrip.position.set(0, this.height * 0.65, -this.width * 0.465);
        bodyGroup.add(rightStrip);

        // ── Forward Navigation Arrow on Top Deck ────────────
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0.35, 0);
        arrowShape.lineTo(-0.15, -0.22);
        arrowShape.lineTo(-0.05, 0);
        arrowShape.lineTo(-0.15, 0.22);
        arrowShape.closePath();

        const arrowGeo = new THREE.ShapeGeometry(arrowShape);
        const arrowMesh = new THREE.Mesh(arrowGeo, neonCyanMat);
        arrowMesh.rotation.x = -Math.PI / 2;
        arrowMesh.position.set(0.1, this.height + 0.005, 0);
        bodyGroup.add(arrowMesh);

        // ── Emergency Stop Button ───────────────────────────
        const eStopBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.3 })
        );
        eStopBase.position.set(-this.length * 0.32, this.height + 0.025, this.width * 0.3);
        bodyGroup.add(eStopBase);

        const eStopButton = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.04, 0.04, 16),
            new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.2 })
        );
        eStopButton.position.set(-this.length * 0.32, this.height + 0.06, this.width * 0.3);
        bodyGroup.add(eStopButton);

        // ── 3D LiDAR Sensor Puck (Mounted on Top Deck) ──────
        const lidarBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.16, 0.12, 24),
            new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.5, metalness: 0.8 })
        );
        lidarBase.position.set(this.length * 0.2, this.height + 0.06, 0);
        bodyGroup.add(lidarBase);

        this.lidarHead = new THREE.Group();
        this.lidarHead.position.set(this.length * 0.2, this.height + 0.14, 0);

        const puckMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24),
            new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.2, metalness: 0.9 })
        );
        puckMesh.castShadow = true;
        this.lidarHead.add(puckMesh);

        // Golden optical sensor window band
        const sensorBand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.132, 0.132, 0.035, 24),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        sensorBand.position.set(0, 0.01, 0);
        this.lidarHead.add(sensorBand);

        // Translucent laser fan disc
        const laserFanGeo = new THREE.RingGeometry(0.2, 2.5, 32, 1, 0, Math.PI * 0.7);
        const laserFanMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
        });
        const laserFan = new THREE.Mesh(laserFanGeo, laserFanMat);
        laserFan.rotation.x = -Math.PI / 2;
        laserFan.position.set(0, 0.01, 0);
        this.lidarHead.add(laserFan);

        bodyGroup.add(this.lidarHead);

        // ── Flashing Amber Safety Beacon Mast ───────────────
        const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12),
            new THREE.MeshStandardMaterial({ color: 0x333, metalness: 0.9 })
        );
        mast.position.set(-this.length * 0.28, this.height + 0.175, -this.width * 0.28);
        bodyGroup.add(mast);

        const beaconGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.12, 16);
        const beaconMat = new THREE.MeshStandardMaterial({
            color: 0xff9800,
            emissive: 0xff9800,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
        });
        this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        this.beaconMesh.position.set(-this.length * 0.28, this.height + 0.38, -this.width * 0.28);
        bodyGroup.add(this.beaconMesh);

        this.beaconLight = new THREE.PointLight(0xff9800, 1.2, 4.0);
        this.beaconLight.position.set(-this.length * 0.28, this.height + 0.42, -this.width * 0.28);
        bodyGroup.add(this.beaconLight);

        // ── Front Headlights & Spotlights ───────────────────
        const headlightGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const hlZ = this.width * 0.32;
        const hlX = this.length * 0.47 + 0.09;
        const hlY = this.height * 0.4;

        const hlMeshLeft = new THREE.Mesh(headlightGeo, headlightMat);
        hlMeshLeft.rotation.z = Math.PI / 2;
        hlMeshLeft.position.set(hlX, hlY, hlZ);
        bodyGroup.add(hlMeshLeft);

        const hlMeshRight = new THREE.Mesh(headlightGeo, headlightMat);
        hlMeshRight.rotation.z = Math.PI / 2;
        hlMeshRight.position.set(hlX, hlY, -hlZ);
        bodyGroup.add(hlMeshRight);

        // Dual spotlights casting forward cone of light onto floor
        this.headlightSpot = new THREE.SpotLight(0xe0f7fa, 2.0, 12, Math.PI / 5, 0.4, 1.5);
        this.headlightSpot.position.set(hlX + 0.1, hlY, 0);
        this.headlightSpotTarget = new THREE.Object3D();
        this.headlightSpotTarget.position.set(hlX + 8, -this.wheelRadius, 0);
        bodyGroup.add(this.headlightSpotTarget);
        this.headlightSpot.target = this.headlightSpotTarget;
        bodyGroup.add(this.headlightSpot);

        // ── Rear Brake / Tail Lights ────────────────────────
        const tailLightGeo = new THREE.BoxGeometry(0.03, 0.08, 0.18);
        const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

        const tlMeshLeft = new THREE.Mesh(tailLightGeo, tailLightMat);
        tlMeshLeft.position.set(-this.length * 0.47 - 0.07, hlY, hlZ);
        bodyGroup.add(tlMeshLeft);

        const tlMeshRight = new THREE.Mesh(tailLightGeo, tailLightMat);
        tlMeshRight.position.set(-this.length * 0.47 - 0.07, hlY, -hlZ);
        bodyGroup.add(tlMeshRight);

        // ── Drive & Caster Wheels ───────────────────────────
        const wheelGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.14, 24);
        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x151515, // Rubber black
            roughness: 0.85,
            metalness: 0.1,
        });
        const hubMat = new THREE.MeshStandardMaterial({
            color: 0x90a4ae, // Silver hubcap
            roughness: 0.3,
            metalness: 0.8,
        });

        // 2 Main Drive Wheels (mid-chassis left & right)
        const driveWheelZ = this.width / 2;
        for (const wz of [driveWheelZ, -driveWheelZ]) {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(0, 0, wz);

            const tire = new THREE.Mesh(wheelGeo, tireMat);
            tire.rotation.x = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(this.wheelRadius * 0.55, this.wheelRadius * 0.55, 0.145, 16),
                hubMat
            );
            hub.rotation.x = Math.PI / 2;
            wheelGroup.add(hub);

            bodyGroup.add(wheelGroup);
            this.wheels.push(wheelGroup);
        }

        // Front & Rear Caster Wheels
        const casterRadius = this.wheelRadius * 0.65;
        const casterGeo = new THREE.SphereGeometry(casterRadius, 16, 16);
        const casterMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.8 });

        const frontCaster = new THREE.Mesh(casterGeo, casterMat);
        frontCaster.position.set(this.length * 0.36, -this.wheelRadius + casterRadius, 0);
        frontCaster.castShadow = true;
        bodyGroup.add(frontCaster);

        const rearCaster = new THREE.Mesh(casterGeo, casterMat);
        rearCaster.position.set(-this.length * 0.36, -this.wheelRadius + casterRadius, 0);
        rearCaster.castShadow = true;
        bodyGroup.add(rearCaster);

        this.group.add(bodyGroup);
    }

    // ── Floating 3D Holographic HUD ───────────────────────────

    _buildHud() {
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.width = 384;
        this.hudCanvas.height = 128;
        this.hudCtx = this.hudCanvas.getContext('2d');

        this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
        this.hudTexture.minFilter = THREE.LinearFilter;

        const spriteMat = new THREE.SpriteMaterial({
            map: this.hudTexture,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
        });

        this.hudSprite = new THREE.Sprite(spriteMat);
        this.hudSprite.scale.set(2.4, 0.8, 1.0);
        this.hudSprite.position.set(0, this.height + 0.95, 0);
        this.group.add(this.hudSprite);

        this._renderHud(0, 'IDLE');
    }

    _renderHud(velocity, state) {
        const ctx = this.hudCtx;
        ctx.clearRect(0, 0, 384, 128);

        // Futuristic pill background with glassmorphism border
        ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
        ctx.beginPath();
        this._roundRect(ctx, 6, 6, 372, 116, 24);
        ctx.fill();

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Left AGV icon badge
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ AGV-01', 28, 48);

        // State indicator
        let stateColor = '#2ecc71';
        if (state === 'PLANNING' || state === 'REPLANNING') stateColor = '#00e5ff';
        else if (state === 'PAUSED' || state === 'BLOCKED') stateColor = '#ff9800';
        else if (state === 'NO_PATH') stateColor = '#ff5252';

        ctx.fillStyle = stateColor;
        ctx.font = '600 20px Inter, monospace';
        ctx.fillText(`[${state}]`, 28, 88);

        // Right velocity gauge
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${velocity.toFixed(2)}`, 356, 56);

        ctx.fillStyle = '#8899aa';
        ctx.font = '500 18px Inter, sans-serif';
        ctx.fillText('m / s', 356, 88);

        this.hudTexture.needsUpdate = true;
    }

    _roundRect(ctx, x, y, w, h, r) {
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

    // ── Real-Time Frame Update ────────────────────────────────

    /**
     * Update vehicle pose, wheel roll, LiDAR spin, and beacon pulse.
     * @param {import('../vehicle/vehicleState.js').VehicleState} vehicleState
     * @param {string} simState
     * @param {number} dt - delta time in seconds
     * @param {number} elapsedTime - total time in seconds
     */
    update(vehicleState, simState, dt, elapsedTime) {
        // 1. Position in Three.js coordinates
        const pos = worldToThree(vehicleState.x, vehicleState.y, 0);
        this.group.position.set(pos.x, 0, pos.z);

        // 2. Heading rotation around Y axis
        this.group.rotation.y = vehicleState.heading;

        // 3. Spin LiDAR sensor puck continuously
        this._lidarAngle += dt * 14.0;
        if (this.lidarHead) {
            this.lidarHead.rotation.y = this._lidarAngle;
        }

        // 4. Roll drive wheels according to vehicle forward velocity
        const rollSpeed = vehicleState.velocity / this.wheelRadius;
        this._wheelAngle += rollSpeed * dt;
        for (const w of this.wheels) {
            // Wheels are oriented cylinder along Z, rotate around Z
            w.children[0].rotation.z = -this._wheelAngle;
            w.children[1].rotation.z = -this._wheelAngle;
        }

        // 5. Pulse safety beacon
        const isMoving = simState === 'MOVING' || vehicleState.velocity > 0.05;
        const flashRate = isMoving ? 8.0 : 2.5;
        const beaconIntensity = 0.5 + 0.8 * Math.abs(Math.sin(elapsedTime * flashRate));
        if (this.beaconLight) {
            this.beaconLight.intensity = beaconIntensity;
        }
        if (this.beaconMesh) {
            this.beaconMesh.material.emissiveIntensity = beaconIntensity;
        }

        // 6. Update holographic HUD if velocity or state changed
        if (Math.abs(vehicleState.velocity - this._lastVelocity) > 0.05 || simState !== this._lastState) {
            this._lastVelocity = vehicleState.velocity;
            this._lastState = simState;
            this._renderHud(vehicleState.velocity, simState);
        }
    }
}
