// ============================================================
// SteadyPath — 3D Dynamic Obstacle & Blockage Renderer
// ============================================================
// Renders dynamic road blockages as high-visibility industrial
// hazard barriers with yellow/black diagonal warning stripes,
// flashing hazard beacons, and floor clearance footprints.
// ============================================================

import * as THREE from 'three';
import { worldToThree } from './coords3d.js';
import { VEHICLE_CONFIG } from '../config/config.js';

export class Blockage3D {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'DynamicBlockages3D';

        // Cache of current blockage meshes by id
        this.blockageMeshes = new Map();
        this.hazardTexture = this._createHazardTexture();
    }

    _createHazardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffb300'; // Safety amber
        ctx.fillRect(0, 0, 256, 256);

        // Diagonal black stripes
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        const stripeW = 28;
        for (let x = -256; x < 512; x += stripeW * 2) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x + stripeW, 0);
            ctx.lineTo(x + stripeW + 256, 256);
            ctx.lineTo(x + 256, 256);
            ctx.closePath();
        }
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.5, 1.5);
        return tex;
    }

    /**
     * Synchronize 3D meshes with the current dynamic obstacles list.
     * @param {Array<Object>} obstacles
     */
    update(obstacles) {
        const activeIds = new Set(obstacles.map((o) => o.id));

        // 1. Remove obsolete blockages
        for (const [id, item] of this.blockageMeshes.entries()) {
            if (!activeIds.has(id)) {
                this.group.remove(item.mesh);
                this.blockageMeshes.delete(id);
            }
        }

        // 2. Add or update active blockages
        for (const obs of obstacles) {
            if (!this.blockageMeshes.has(obs.id)) {
                const mesh = this._createBlockageMesh(obs);
                this.group.add(mesh);
                this.blockageMeshes.set(obs.id, {
                    obs,
                    mesh,
                    beacon: mesh.userData.beacon,
                    beaconLight: mesh.userData.beaconLight,
                    spawnTime: performance.now(),
                });
            }
        }
    }

    _createBlockageMesh(obs) {
        const blockGroup = new THREE.Group();
        blockGroup.name = `Blockage_${obs.id}`;

        const centerWorldX = obs.x + obs.width / 2;
        const centerWorldY = obs.y + obs.height / 2;
        const pos = worldToThree(centerWorldX, centerWorldY, 0);
        blockGroup.position.set(pos.x, 0, pos.z);

        const bw = obs.width;
        const bd = obs.height;
        const bh = 1.1;

        // 1. Heavy industrial hazard concrete barrier body
        const bodyGeo = new THREE.BoxGeometry(bw * 0.96, bh, bd * 0.96);
        const bodyMat = new THREE.MeshStandardMaterial({
            map: this.hazardTexture,
            roughness: 0.5,
            metalness: 0.2,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = bh / 2;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        blockGroup.add(bodyMesh);

        // 2. Heavy steel base plate
        const baseGeo = new THREE.BoxGeometry(bw * 1.02, 0.08, bd * 1.02);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x222, metalness: 0.8 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.04;
        baseMesh.castShadow = true;
        blockGroup.add(baseMesh);

        // 3. Flashing warning strobe beacon on top
        const beaconStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12);
        const beaconStemMat = new THREE.MeshStandardMaterial({ color: 0x333 });
        const stem = new THREE.Mesh(beaconStemGeo, beaconStemMat);
        stem.position.set(0, bh + 0.125, 0);
        blockGroup.add(stem);

        const beaconGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.18, 16);
        const beaconMat = new THREE.MeshStandardMaterial({
            color: 0xff3d00,
            emissive: 0xff3d00,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9,
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(0, bh + 0.32, 0);
        blockGroup.add(beaconMesh);

        const beaconLight = new THREE.PointLight(0xff3d00, 2.0, 5.0);
        beaconLight.position.set(0, bh + 0.35, 0);
        blockGroup.add(beaconLight);

        // 4. Stenciled "ROAD CLOSED" floating badge
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 248, 88);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚧 BLOCKED', 128, 48);

        const tex = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.scale.set(1.2, 0.45, 1);
        labelSprite.position.set(0, bh + 0.8, 0);
        blockGroup.add(labelSprite);

        // 5. Floor safety clearance perimeter projection
        const inflate = VEHICLE_CONFIG.width / 2 + VEHICLE_CONFIG.safetyMargin;
        const footW = bw + inflate * 2;
        const footD = bd + inflate * 2;
        const footGeo = new THREE.PlaneGeometry(footW, footD);
        const footMat = new THREE.MeshBasicMaterial({
            color: 0xff1744,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
        });
        const footMesh = new THREE.Mesh(footGeo, footMat);
        footMesh.rotation.x = -Math.PI / 2;
        footMesh.position.y = 0.02;
        blockGroup.add(footMesh);

        blockGroup.userData = {
            beacon: beaconMesh,
            beaconLight: beaconLight,
        };

        return blockGroup;
    }

    /**
     * Animate flashing beacons.
     * @param {number} time - elapsed time in seconds
     */
    animate(time) {
        for (const item of this.blockageMeshes.values()) {
            const flash = (Math.sin(time * 8.0) > 0.1) ? 1.0 : 0.1;
            if (item.beacon) {
                item.beacon.material.emissiveIntensity = flash;
            }
            if (item.beaconLight) {
                item.beaconLight.intensity = flash * 2.2;
            }
        }
    }
}
