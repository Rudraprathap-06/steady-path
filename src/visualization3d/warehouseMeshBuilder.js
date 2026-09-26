// ============================================================
// SteadyPath — 3D Warehouse Environment Mesh Builder
// ============================================================
// Generates detailed 3D meshes for the warehouse:
// - Polished industrial floor with lane markings & safety borders
// - Multi-tier industrial pallet racks with realistic cargo boxes
// - Structural concrete columns & dividing walls with hazard stripes
// - Loading dock bays with illuminated zones & pallet staging
// - Restricted zones with warning bollards & laser fencing
// - Ceiling structural trusses & high-bay pendant light fixtures
// ============================================================

import * as THREE from 'three';
import { WAREHOUSE, COLORS } from '../config/config.js';
import { worldToThree, HALF_WIDTH, HALF_HEIGHT } from './coords3d.js';

export class WarehouseMeshBuilder {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'WarehouseEnvironment';
        this.animatedObjects = [];
    }

    /**
     * Build the complete warehouse 3D scene geometry.
     * @param {import('../map/warehouseMap.js').WarehouseMap} map
     * @returns {THREE.Group}
     */
    build(map) {
        // Clear previous meshes if any
        while (this.group.children.length > 0) {
            const obj = this.group.children[0];
            this.group.remove(obj);
        }
        this.animatedObjects = [];

        this._createFloor();
        this._createPerimeterWalls();
        this._createStaticObstacles(map.staticObstacles);
        this._createLoadingZones(map.loadingZones);
        this._createRestrictedZones(map.restrictedZones);
        this._createOverheadStructure();

        return this.group;
    }

    /**
     * Update animations (e.g. hazard beacons, glowing borders).
     * @param {number} time - elapsed time in seconds
     */
    update(time) {
        for (const item of this.animatedObjects) {
            if (item.type === 'pulse') {
                const s = 0.8 + 0.2 * Math.sin(time * 3 + (item.offset || 0));
                item.mesh.material.opacity = item.baseOpacity * s;
            } else if (item.type === 'beacon') {
                const flash = (Math.sin(time * 6 + (item.offset || 0)) > 0.3) ? 1.0 : 0.15;
                item.light.intensity = item.baseIntensity * flash;
                if (item.mesh) {
                    item.mesh.material.emissiveIntensity = flash;
                }
            }
        }
    }

    // ── Floor Generation ──────────────────────────────────────

    _createFloor() {
        // 1. High-resolution canvas texture for realistic warehouse floor
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = Math.round(2048 * (WAREHOUSE.height / WAREHOUSE.width));
        const ctx = canvas.getContext('2d');
        const cw = canvas.width;
        const ch = canvas.height;

        // Base concrete color
        ctx.fillStyle = '#161922';
        ctx.fillRect(0, 0, cw, ch);

        // Concrete grain / fine noise
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        for (let i = 0; i < 60000; i++) {
            const rx = Math.random() * cw;
            const ry = Math.random() * ch;
            ctx.fillRect(rx, ry, 1, 1);
        }

        // Warehouse concrete expansion joint seams (5m x 5m grid)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        const seamSpacingX = cw / (WAREHOUSE.width / 5);
        const seamSpacingY = ch / (WAREHOUSE.height / 5);
        for (let x = 0; x <= cw; x += seamSpacingX) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ch);
            ctx.stroke();
        }
        for (let y = 0; y <= ch; y += seamSpacingY) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cw, y);
            ctx.stroke();
        }

        // Yellow and black safety hazard striped perimeter border (0.5m wide)
        const borderPx = (0.5 / WAREHOUSE.width) * cw;
        this._drawHazardBorder(ctx, cw, ch, borderPx);

        // Main navigation road centerlines (dashed cyan-white road paint)
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 14]);

        // Main horizontal driveways at y = 2.5m, y = 9.7m, y = 18m
        const roadYs = [
            ch - (2.5 / WAREHOUSE.height) * ch,
            ch - (9.7 / WAREHOUSE.height) * ch,
            ch - (18.0 / WAREHOUSE.height) * ch,
        ];
        for (const ry of roadYs) {
            ctx.beginPath();
            ctx.moveTo(borderPx * 2, ry);
            ctx.lineTo(cw - borderPx * 2, ry);
            ctx.stroke();
        }

        // Main cross-aisle vertical driveways at x = 2m, x = 8.5m, x = 15.5m, x = 23.5m
        const roadXs = [
            (2.0 / WAREHOUSE.width) * cw,
            (8.5 / WAREHOUSE.width) * cw,
            (15.5 / WAREHOUSE.width) * cw,
            (23.5 / WAREHOUSE.width) * cw,
        ];
        for (const rx of roadXs) {
            ctx.beginPath();
            ctx.moveTo(rx, borderPx * 2);
            ctx.lineTo(rx, ch - borderPx * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Aisle Stencil markings on floor
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const aisleLabels = [
            { text: '◄ AISLE 01 ►', x: 5.5, y: 9.7 },
            { text: '◄ AISLE 02 ►', x: 12.5, y: 9.7 },
            { text: '◄ AISLE 03 ►', x: 19.5, y: 9.7 },
            { text: '◄ FAST LANE ►', x: 15.0, y: 2.5 },
        ];
        for (const l of aisleLabels) {
            const px = (l.x / WAREHOUSE.width) * cw;
            const py = ch - (l.y / WAREHOUSE.height) * ch;
            ctx.fillText(l.text, px, py);
        }

        const floorTexture = new THREE.CanvasTexture(canvas);
        floorTexture.anisotropy = 8;

        // Warehouse floor plane
        const floorGeo = new THREE.PlaneGeometry(WAREHOUSE.width, WAREHOUSE.height);
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.38,
            metalness: 0.15,
        });

        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.set(0, 0, 0);
        floorMesh.receiveShadow = true;
        floorMesh.name = 'WarehouseFloor';
        this.group.add(floorMesh);

        // Infinite dark surrounding apron outside the warehouse
        const apronGeo = new THREE.PlaneGeometry(80, 70);
        const apronMat = new THREE.MeshStandardMaterial({
            color: 0x090b10,
            roughness: 0.9,
            metalness: 0.05,
        });
        const apronMesh = new THREE.Mesh(apronGeo, apronMat);
        apronMesh.rotation.x = -Math.PI / 2;
        apronMesh.position.set(0, -0.01, 0);
        apronMesh.receiveShadow = true;
        this.group.add(apronMesh);
    }

    _drawHazardBorder(ctx, w, h, b) {
        ctx.save();
        ctx.fillStyle = '#ffb300';
        ctx.fillRect(0, 0, w, b);
        ctx.fillRect(0, h - b, w, b);
        ctx.fillRect(0, 0, b, h);
        ctx.fillRect(w - b, 0, b, h);

        // Diagonal black stripes
        ctx.fillStyle = '#111';
        ctx.beginPath();
        const stripeW = 18;
        for (let x = -h; x < w + h; x += stripeW * 2) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x + stripeW, 0);
            ctx.lineTo(x + stripeW + h, h);
            ctx.lineTo(x + h, h);
            ctx.closePath();
        }
        ctx.clip();
        ctx.fillRect(0, 0, w, b);
        ctx.fillRect(0, h - b, w, b);
        ctx.fillRect(0, 0, b, h);
        ctx.fillRect(w - b, 0, b, h);
        ctx.restore();
    }

    // ── Perimeter Kick-Walls & Corner Columns ─────────────────

    _createPerimeterWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x222736,
            roughness: 0.5,
            metalness: 0.3,
        });
        const curbMat = new THREE.MeshStandardMaterial({
            color: 0xffb300,
            roughness: 0.4,
            metalness: 0.2,
        });

        const curbHeight = 0.35;
        const curbThickness = 0.25;

        // North and South curbs
        const nsGeo = new THREE.BoxGeometry(WAREHOUSE.width + curbThickness * 2, curbHeight, curbThickness);
        const northCurb = new THREE.Mesh(nsGeo, curbMat);
        northCurb.position.set(0, curbHeight / 2, -HALF_HEIGHT - curbThickness / 2);
        northCurb.castShadow = true;
        northCurb.receiveShadow = true;
        this.group.add(northCurb);

        const southCurb = new THREE.Mesh(nsGeo, curbMat);
        southCurb.position.set(0, curbHeight / 2, HALF_HEIGHT + curbThickness / 2);
        southCurb.castShadow = true;
        southCurb.receiveShadow = true;
        this.group.add(southCurb);

        // East and West curbs
        const ewGeo = new THREE.BoxGeometry(curbThickness, curbHeight, WAREHOUSE.height);
        const eastCurb = new THREE.Mesh(ewGeo, curbMat);
        eastCurb.position.set(HALF_WIDTH + curbThickness / 2, curbHeight / 2, 0);
        eastCurb.castShadow = true;
        eastCurb.receiveShadow = true;
        this.group.add(eastCurb);

        const westCurb = new THREE.Mesh(ewGeo, curbMat);
        westCurb.position.set(-HALF_WIDTH - curbThickness / 2, curbHeight / 2, 0);
        westCurb.castShadow = true;
        westCurb.receiveShadow = true;
        this.group.add(westCurb);

        // Modern perimeter guard posts / bollards at 4 corners
        const cornerPositions = [
            [-HALF_WIDTH, -HALF_HEIGHT],
            [HALF_WIDTH, -HALF_HEIGHT],
            [-HALF_WIDTH, HALF_HEIGHT],
            [HALF_WIDTH, HALF_HEIGHT],
        ];
        const bollardGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 16);
        const bollardMat = new THREE.MeshStandardMaterial({
            color: 0xffb300,
            roughness: 0.3,
            metalness: 0.4,
        });
        for (const [cx, cz] of cornerPositions) {
            const b = new THREE.Mesh(bollardGeo, bollardMat);
            b.position.set(cx, 0.6, cz);
            b.castShadow = true;
            this.group.add(b);
        }
    }

    // ── Static Obstacles: Pallet Racks, Walls, Pillars ────────

    _createStaticObstacles(obstacles) {
        for (const obs of obstacles) {
            if (obs.type === 'rack') {
                this._createPalletRack(obs);
            } else if (obs.type === 'wall') {
                this._createInteriorWall(obs);
            } else if (obs.type === 'pillar') {
                this._createStructuralPillar(obs);
            }
        }
    }

    _createPalletRack(obs) {
        const rackGroup = new THREE.Group();
        rackGroup.name = `Rack_${obs.id}`;

        // Warehouse 2D coords: (obs.x, obs.y) is bottom-left, width along X, height along Y
        // Three.js coords: center of rack
        const centerWorldX = obs.x + obs.width / 2;
        const centerWorldY = obs.y + obs.height / 2;
        const pos = worldToThree(centerWorldX, centerWorldY, 0);

        rackGroup.position.set(pos.x, 0, pos.z);

        const rackW = obs.width;       // e.g. 3m
        const rackD = obs.height;      // e.g. 4m (along Z in Three.js)
        const rackH = 3.6;             // meters high
        const numShelves = 3;
        const shelfLevels = [0.35, 1.45, 2.55];

        // Shared materials
        const steelBlueMat = new THREE.MeshStandardMaterial({
            color: 0x1a4373, // Industrial cobalt steel uprights
            roughness: 0.3,
            metalness: 0.7,
        });
        const beamOrangeMat = new THREE.MeshStandardMaterial({
            color: 0xe65100, // Safety orange load beams
            roughness: 0.4,
            metalness: 0.5,
        });
        const palletWoodMat = new THREE.MeshStandardMaterial({
            color: 0x9e7e59, // Pine pallet wood
            roughness: 0.8,
            metalness: 0.05,
        });

        // 1. Upright steel columns (posts) at corners & midpoints
        const colGeo = new THREE.BoxGeometry(0.1, rackH, 0.1);
        const colXs = [-rackW / 2 + 0.05, 0, rackW / 2 - 0.05];
        const colZs = [-rackD / 2 + 0.05, 0, rackD / 2 - 0.05];

        for (const cx of colXs) {
            for (const cz of colZs) {
                const colMesh = new THREE.Mesh(colGeo, steelBlueMat);
                colMesh.position.set(cx, rackH / 2, cz);
                colMesh.castShadow = true;
                colMesh.receiveShadow = true;
                rackGroup.add(colMesh);
            }
        }

        // 2. Horizontal orange load beams for each shelf level
        const beamGeoX = new THREE.BoxGeometry(rackW, 0.08, 0.08);
        const beamGeoZ = new THREE.BoxGeometry(0.08, 0.08, rackD);

        for (const sy of shelfLevels) {
            // Front & Back beams
            for (const cz of [-rackD / 2 + 0.04, rackD / 2 - 0.04]) {
                const beamX = new THREE.Mesh(beamGeoX, beamOrangeMat);
                beamX.position.set(0, sy, cz);
                beamX.castShadow = true;
                rackGroup.add(beamX);
            }
            // Left & Right beams
            for (const cx of [-rackW / 2 + 0.04, rackW / 2 - 0.04]) {
                const beamZ = new THREE.Mesh(beamGeoZ, beamOrangeMat);
                beamZ.position.set(cx, sy, 0);
                beamZ.castShadow = true;
                rackGroup.add(beamZ);
            }

            // 3. Pallet shelves & stacked cargo crates
            this._populateShelf(rackGroup, rackW, rackD, sy, palletWoodMat);
        }

        // 4. Rack ID signage on front aisle
        this._createRackSign(rackGroup, obs.id, 0, rackH + 0.25, -rackD / 2);

        this.group.add(rackGroup);
    }

    _populateShelf(rackGroup, rackW, rackD, shelfY, palletMat) {
        // Place a grid of pallets on each shelf level
        const palletW = 1.0;
        const palletD = 1.2;
        const palletH = 0.12;
        const palletGeo = new THREE.BoxGeometry(palletW, palletH, palletD);

        const boxColors = [
            0xbcaaa4, // Kraft cardboard brown
            0x8d6e63, // Dark corrugated fiber
            0x37474f, // Industrial dark container
            0x00838f, // Teal plastic crate
            0xf57c00, // Safety warning box
            0xe0e0e0, // White barcode box
        ];

        // 2 pallets along X, 2 along Z
        const pXs = [-rackW / 4, rackW / 4];
        const pZs = [-rackD / 4, rackD / 4];

        for (const px of pXs) {
            for (const pz of pZs) {
                // Pallet
                const pallet = new THREE.Mesh(palletGeo, palletMat);
                pallet.position.set(px, shelfY + palletH / 2 + 0.04, pz);
                pallet.castShadow = true;
                pallet.receiveShadow = true;
                rackGroup.add(pallet);

                // Stacked boxes on pallet
                const numBoxes = 1 + Math.floor(Math.random() * 3);
                let currentY = shelfY + palletH + 0.04;

                for (let b = 0; b < numBoxes; b++) {
                    const bw = palletW * (0.45 + Math.random() * 0.45);
                    const bd = palletD * (0.45 + Math.random() * 0.45);
                    const bh = 0.25 + Math.random() * 0.35;

                    const color = boxColors[Math.floor(Math.random() * boxColors.length)];
                    const boxMat = new THREE.MeshStandardMaterial({
                        color,
                        roughness: 0.7,
                        metalness: 0.1,
                    });

                    const boxGeo = new THREE.BoxGeometry(bw, bh, bd);
                    const box = new THREE.Mesh(boxGeo, boxMat);
                    box.position.set(
                        px + (Math.random() - 0.5) * 0.1,
                        currentY + bh / 2,
                        pz + (Math.random() - 0.5) * 0.1
                    );
                    box.castShadow = true;
                    box.receiveShadow = true;
                    rackGroup.add(box);

                    currentY += bh;
                    if (currentY > shelfY + 0.95) break; // Don't penetrate upper shelf
                }
            }
        }
    }

    _createRackSign(rackGroup, id, x, y, z) {
        const labelText = id.replace('rack_', 'R-').toUpperCase();

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, 256, 96);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 250, 90);

        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 50px Inter, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 128, 48);

        const tex = new THREE.CanvasTexture(canvas);
        const signGeo = new THREE.PlaneGeometry(0.8, 0.3);
        const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        const signMesh = new THREE.Mesh(signGeo, signMat);
        signMesh.position.set(x, y, z - 0.05);
        rackGroup.add(signMesh);
    }

    _createInteriorWall(obs) {
        // Warehouse 2D coords
        const centerWorldX = obs.x + obs.width / 2;
        const centerWorldY = obs.y + obs.height / 2;
        const pos = worldToThree(centerWorldX, centerWorldY, 0);

        const wallH = 3.2;
        const wallGeo = new THREE.BoxGeometry(obs.width, wallH, obs.height);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x3d4457,
            roughness: 0.6,
            metalness: 0.2,
        });

        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(pos.x, wallH / 2, pos.z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        wallMesh.name = `Wall_${obs.id}`;
        this.group.add(wallMesh);

        // Yellow warning stripe along bottom of wall
        const stripeGeo = new THREE.BoxGeometry(obs.width + 0.02, 0.3, obs.height + 0.02);
        const stripeMat = new THREE.MeshStandardMaterial({
            color: 0xffb300,
            roughness: 0.4,
            metalness: 0.3,
        });
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(pos.x, 0.15, pos.z);
        this.group.add(stripeMesh);
    }

    _createStructuralPillar(obs) {
        const centerWorldX = obs.x + obs.width / 2;
        const centerWorldY = obs.y + obs.height / 2;
        const pos = worldToThree(centerWorldX, centerWorldY, 0);

        const pillarRadius = (obs.width / 2) * 1.05;
        const pillarH = 5.2;

        const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarH, 24);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x474c5d,
            roughness: 0.5,
            metalness: 0.3,
        });

        const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
        pillarMesh.position.set(pos.x, pillarH / 2, pos.z);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        pillarMesh.name = `Pillar_${obs.id}`;
        this.group.add(pillarMesh);

        // Yellow/black collision collar at base (1.2m high)
        const collarGeo = new THREE.CylinderGeometry(pillarRadius + 0.03, pillarRadius + 0.03, 1.2, 24);
        const collarMat = new THREE.MeshStandardMaterial({
            color: 0xffb300,
            roughness: 0.4,
            metalness: 0.2,
        });
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.position.set(pos.x, 0.6, pos.z);
        this.group.add(collarMesh);
    }

    // ── Loading Zones ─────────────────────────────────────────

    _createLoadingZones(loadingZones) {
        for (const zone of loadingZones) {
            const centerWorldX = zone.x + zone.width / 2;
            const centerWorldY = zone.y + zone.height / 2;
            const pos = worldToThree(centerWorldX, centerWorldY, 0.015);

            // Glowing floor decal
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgba(46, 204, 113, 0.12)';
            ctx.fillRect(0, 0, 512, 512);

            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 14;
            ctx.strokeRect(7, 7, 498, 498);

            // Stencil corner marks
            ctx.lineWidth = 28;
            ctx.beginPath();
            ctx.moveTo(7, 80); ctx.lineTo(7, 7); ctx.lineTo(80, 7);
            ctx.moveTo(505, 80); ctx.lineTo(505, 7); ctx.lineTo(432, 7);
            ctx.moveTo(7, 432); ctx.lineTo(7, 505); ctx.lineTo(80, 505);
            ctx.moveTo(505, 432); ctx.lineTo(505, 505); ctx.lineTo(432, 505);
            ctx.stroke();

            // Label
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 44px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.label || 'LOADING DOCK', 256, 256);

            const tex = new THREE.CanvasTexture(canvas);
            const zoneGeo = new THREE.PlaneGeometry(zone.width, zone.height);
            const zoneMat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                opacity: 0.85,
            });

            const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
            zoneMesh.rotation.x = -Math.PI / 2;
            zoneMesh.position.set(pos.x, 0.02, pos.z);
            this.group.add(zoneMesh);

            this.animatedObjects.push({
                type: 'pulse',
                mesh: zoneMesh,
                baseOpacity: 0.85,
                offset: Math.random() * Math.PI,
            });

            // A couple of staging pallets ready for pickup in the zone
            const palletGeo = new THREE.BoxGeometry(1.0, 0.12, 1.2);
            const palletMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
            const p1 = new THREE.Mesh(palletGeo, palletMat);
            p1.position.set(pos.x - 0.6, 0.06, pos.z);
            p1.castShadow = true;
            this.group.add(p1);

            // Wrapped cargo crate on pallet
            const boxGeo = new THREE.BoxGeometry(0.9, 0.8, 1.0);
            const boxMat = new THREE.MeshStandardMaterial({
                color: 0x43a047, // Green logistics freight
                roughness: 0.4,
                metalness: 0.2,
            });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(pos.x - 0.6, 0.12 + 0.4, pos.z);
            box.castShadow = true;
            this.group.add(box);
        }
    }

    // ── Restricted Hazard Zones ───────────────────────────────

    _createRestrictedZones(restrictedZones) {
        for (const zone of restrictedZones) {
            const centerWorldX = zone.x + zone.width / 2;
            const centerWorldY = zone.y + zone.height / 2;
            const pos = worldToThree(centerWorldX, centerWorldY, 0.02);

            // Glowing red translucent floor box
            const zoneGeo = new THREE.PlaneGeometry(zone.width, zone.height);
            const zoneMat = new THREE.MeshBasicMaterial({
                color: 0xe74c3c,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
            });
            const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
            zoneMesh.rotation.x = -Math.PI / 2;
            zoneMesh.position.set(pos.x, 0.025, pos.z);
            this.group.add(zoneMesh);

            // Pulsing translucent volumetric red barrier
            const barrierH = 1.0;
            const barrierGeo = new THREE.BoxGeometry(zone.width, barrierH, zone.height);
            const barrierMat = new THREE.MeshBasicMaterial({
                color: 0xff1744,
                transparent: true,
                opacity: 0.15,
                wireframe: true,
            });
            const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
            barrierMesh.position.set(pos.x, barrierH / 2, pos.z);
            this.group.add(barrierMesh);

            this.animatedObjects.push({
                type: 'pulse',
                mesh: barrierMesh,
                baseOpacity: 0.2,
                offset: 0,
            });

            // Hazard bollards at 4 corners with flashing red lights
            const hx = zone.width / 2;
            const hz = zone.height / 2;
            const corners = [
                [pos.x - hx, pos.z - hz],
                [pos.x + hx, pos.z - hz],
                [pos.x - hx, pos.z + hz],
                [pos.x + hx, pos.z + hz],
            ];

            const bollardGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 16);
            const bollardMat = new THREE.MeshStandardMaterial({
                color: 0xff1744,
                roughness: 0.3,
                metalness: 0.5,
            });

            for (let i = 0; i < corners.length; i++) {
                const [cx, cz] = corners[i];
                const post = new THREE.Mesh(bollardGeo, bollardMat);
                post.position.set(cx, 0.55, cz);
                post.castShadow = true;
                this.group.add(post);

                // Flashing red strobe beacon on top
                const beaconGeo = new THREE.SphereGeometry(0.06, 12, 12);
                const beaconMat = new THREE.MeshStandardMaterial({
                    color: 0xff0033,
                    emissive: 0xff0033,
                    emissiveIntensity: 1.0,
                });
                const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
                beaconMesh.position.set(cx, 1.15, cz);
                this.group.add(beaconMesh);

                const beaconLight = new THREE.PointLight(0xff0033, 1.5, 3.5);
                beaconLight.position.set(cx, 1.2, cz);
                this.group.add(beaconLight);

                this.animatedObjects.push({
                    type: 'beacon',
                    mesh: beaconMesh,
                    light: beaconLight,
                    baseIntensity: 1.5,
                    offset: i * 0.5,
                });
            }
        }
    }

    // ── Ceiling Trusses & Overhead Pendant High-Bay Lamps ─────

    _createOverheadStructure() {
        const trussMat = new THREE.MeshStandardMaterial({
            color: 0x1f2430,
            roughness: 0.7,
            metalness: 0.5,
        });

        const trussHeight = 5.2;

        // Transverse structural steel beams across the ceiling
        const beamGeo = new THREE.BoxGeometry(WAREHOUSE.width + 1.0, 0.25, 0.25);
        const beamZPositions = [-HALF_HEIGHT + 2, 0, HALF_HEIGHT - 2];

        for (const bz of beamZPositions) {
            const beam = new THREE.Mesh(beamGeo, trussMat);
            beam.position.set(0, trussHeight, bz);
            this.group.add(beam);

            // Overhead High-Bay pendant fixtures hanging down
            const lampXs = [-8, 0, 8];
            for (const lx of lampXs) {
                this._createHighBayLamp(lx, trussHeight, bz);
            }
        }
    }

    _createHighBayLamp(x, trussY, z) {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(x, trussY, z);

        // Suspension cable
        const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8);
        const cableMat = new THREE.MeshBasicMaterial({ color: 0x444 });
        const cable = new THREE.Mesh(cableGeo, cableMat);
        cable.position.set(0, -0.4, 0);
        lampGroup.add(cable);

        // Bell reflector housing
        const bellGeo = new THREE.ConeGeometry(0.4, 0.35, 16, 1, true);
        const bellMat = new THREE.MeshStandardMaterial({
            color: 0x2b3040,
            roughness: 0.3,
            metalness: 0.8,
            side: THREE.DoubleSide,
        });
        const bell = new THREE.Mesh(bellGeo, bellMat);
        bell.rotation.x = Math.PI;
        bell.position.set(0, -0.85, 0);
        lampGroup.add(bell);

        // Glowing lamp bulb
        const bulbGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3e0 });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(0, -0.88, 0);
        lampGroup.add(bulb);

        // Soft spotlight casting illumination down onto the floor
        const spot = new THREE.SpotLight(0xfff5ea, 1.2, 16, Math.PI / 4, 0.4, 1.5);
        spot.position.set(x, trussY - 0.9, z);
        spot.target.position.set(x, 0, z);
        this.group.add(spot.target);
        this.group.add(spot);

        this.group.add(lampGroup);
    }
}
