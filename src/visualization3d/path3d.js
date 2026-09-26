// ============================================================
// SteadyPath — 3D Path & Trajectory Visualizer
// ============================================================
// Renders:
// - Raw A* discrete grid path (cyan dashed line / nodes)
// - Smoothed trajectory ribbon with animated pulse & directional chevrons
// - Dynamic replanned route (vibrant warning amber)
// - Holographic goal beacon (vertical light column, pulsing floor rings,
//   and rotating gold diamond waypoint crystal)
// ============================================================

import * as THREE from 'three';
import { worldToThree } from './coords3d.js';
import { COLORS } from '../config/config.js';

export class Path3D {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'Path3DGroup';

        // Subgroups
        this.rawPathGroup = new THREE.Group();
        this.smoothPathGroup = new THREE.Group();
        this.chevronsGroup = new THREE.Group();
        this.goalBeaconGroup = new THREE.Group();

        this.group.add(this.rawPathGroup);
        this.group.add(this.smoothPathGroup);
        this.group.add(this.chevronsGroup);
        this.group.add(this.goalBeaconGroup);

        this._pulseOffset = 0;
        this._currentDestination = null;
        this._goalCrystal = null;
        this._goalLightColumn = null;
        this._goalFloorRings = [];

        this._buildGoalBeacon();
    }

    _buildGoalBeacon() {
        // 1. Vertical glowing light cylinder (holographic beacon beam)
        const colGeo = new THREE.CylinderGeometry(0.08, 0.45, 3.8, 24, 1, true);
        const colMat = new THREE.MeshBasicMaterial({
            color: 0xffd740,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        this._goalLightColumn = new THREE.Mesh(colGeo, colMat);
        this._goalLightColumn.position.y = 1.9;
        this.goalBeaconGroup.add(this._goalLightColumn);

        // 2. Floating rotating gold diamond crystal
        const crystalGeo = new THREE.OctahedronGeometry(0.32, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0xffd740,
            emissive: 0xffab00,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.9,
        });
        this._goalCrystal = new THREE.Mesh(crystalGeo, crystalMat);
        this._goalCrystal.position.y = 1.6;
        this.goalBeaconGroup.add(this._goalCrystal);

        // 3. Concentric pulsing target rings on floor
        for (let r = 0; r < 3; r++) {
            const ringGeo = new THREE.RingGeometry(0.3 + r * 0.45, 0.36 + r * 0.45, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffd740,
                transparent: true,
                opacity: 0.7 - r * 0.2,
                side: THREE.DoubleSide,
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.y = 0.03 + r * 0.005;
            this.goalBeaconGroup.add(ringMesh);
            this._goalFloorRings.push({ mesh: ringMesh, baseRadius: 0.3 + r * 0.45, index: r });
        }

        // 4. "GOAL" 3D Billboard label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(20, 24, 34, 0.9)';
        ctx.beginPath();
        ctx.roundRect(4, 4, 248, 88, 16);
        ctx.fill();
        ctx.strokeStyle = '#ffd740';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffd740';
        ctx.font = 'bold 44px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ GOAL', 128, 48);

        const tex = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.scale.set(1.4, 0.52, 1);
        labelSprite.position.set(0, 2.5, 0);
        this.goalBeaconGroup.add(labelSprite);

        this.goalBeaconGroup.visible = false;
    }

    /**
     * Render the paths and destination.
     * @param {import('../interface/plannerInterface.js').PlannerResult|null} planResult
     * @param {{x: number, y: number}|null} destination
     * @param {number} waypointIndex
     */
    update(planResult, destination, waypointIndex = 0) {
        // ── Destination Beacon ──────────────────────────────
        if (destination) {
            const pos = worldToThree(destination.x, destination.y, 0);
            this.goalBeaconGroup.position.set(pos.x, 0, pos.z);
            this.goalBeaconGroup.visible = true;
        } else {
            this.goalBeaconGroup.visible = false;
        }

        // ── Clear previous path lines ───────────────────────
        this._clearGroup(this.rawPathGroup);
        this._clearGroup(this.smoothPathGroup);
        this._clearGroup(this.chevronsGroup);

        if (!planResult || !planResult.success) return;

        // ── Raw A* Path (Dashed cyan line) ──────────────────
        if (planResult.rawPath && planResult.rawPath.length > 1) {
            const rawPoints = planResult.rawPath.map((p) => {
                const pt = worldToThree(p.x, p.y, 0.05);
                return new THREE.Vector3(pt.x, pt.y, pt.z);
            });

            const rawGeo = new THREE.BufferGeometry().setFromPoints(rawPoints);
            const rawMat = new THREE.LineDashedMaterial({
                color: 0x00bcd4,
                dashSize: 0.4,
                gapSize: 0.25,
                linewidth: 2,
                transparent: true,
                opacity: 0.55,
            });
            const rawLine = new THREE.Line(rawGeo, rawMat);
            rawLine.computeLineDistances();
            this.rawPathGroup.add(rawLine);
        }

        // ── Smoothed Path Trajectory Ribbon ─────────────────
        const isReplanned = planResult.metadata?.replanned;
        const mainColor = isReplanned ? 0xff9800 : 0x2ecc71; // Amber for replan, Green for normal
        const pathPoints = (planResult.path && planResult.path.length > 1) ? planResult.path : [];

        if (pathPoints.length > 1) {
            // Build a 3D flat ribbon on floor (y = 0.07m)
            const ribbonMesh = this._createRibbonMesh(pathPoints, 0.22, 0.07, mainColor);
            if (ribbonMesh) {
                this.smoothPathGroup.add(ribbonMesh);
            }

            // Directional Chevron Arrows along trajectory
            this._createChevrons(planResult.trajectory || pathPoints, mainColor, waypointIndex);
        }
    }

    _createRibbonMesh(points, ribbonWidth, elevation, colorHex) {
        if (points.length < 2) return null;

        const verts = [];
        const uvs = [];
        const indices = [];

        const halfW = ribbonWidth / 2;
        let cumulativeDist = 0;

        for (let i = 0; i < points.length; i++) {
            const p = worldToThree(points[i].x, points[i].y, elevation);

            // Compute tangent vector
            let dx, dz;
            if (i < points.length - 1) {
                const next = worldToThree(points[i + 1].x, points[i + 1].y, elevation);
                dx = next.x - p.x;
                dz = next.z - p.z;
            } else {
                const prev = worldToThree(points[i - 1].x, points[i - 1].y, elevation);
                dx = p.x - prev.x;
                dz = p.z - prev.z;
            }

            const len = Math.hypot(dx, dz) || 1;
            const nx = -dz / len;
            const nz = dx / len;

            if (i > 0) {
                const prevP = worldToThree(points[i - 1].x, points[i - 1].y, elevation);
                cumulativeDist += Math.hypot(p.x - prevP.x, p.z - prevP.z);
            }

            // Left & right vertex of ribbon
            verts.push(p.x + nx * halfW, elevation, p.z + nz * halfW);
            verts.push(p.x - nx * halfW, elevation, p.z - nz * halfW);

            uvs.push(0, cumulativeDist);
            uvs.push(1, cumulativeDist);

            if (i < points.length - 1) {
                const v0 = i * 2;
                const v1 = i * 2 + 1;
                const v2 = (i + 1) * 2;
                const v3 = (i + 1) * 2 + 1;
                indices.push(v0, v2, v1);
                indices.push(v1, v2, v3);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
        });

        return new THREE.Mesh(geo, mat);
    }

    _createChevrons(waypoints, colorHex, currentWpIndex) {
        if (!waypoints || waypoints.length < 2) return;

        const chevronMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
        });

        const step = Math.max(1, Math.floor(waypoints.length / 18)); // ~18 arrows along route

        for (let i = currentWpIndex; i < waypoints.length; i += step) {
            const wp = waypoints[i];
            const p = worldToThree(wp.x, wp.y, 0.085);

            let heading = wp.heading;
            if (heading === undefined) {
                const next = waypoints[Math.min(i + 1, waypoints.length - 1)];
                heading = Math.atan2(next.y - wp.y, next.x - wp.x);
            }

            // Chevron triangle mesh
            const shape = new THREE.Shape();
            const sz = 0.28;
            shape.moveTo(sz * 0.8, 0);
            shape.lineTo(-sz * 0.6, -sz * 0.5);
            shape.lineTo(-sz * 0.2, 0);
            shape.lineTo(-sz * 0.6, sz * 0.5);
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape);
            const mesh = new THREE.Mesh(geo, chevronMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = -heading + Math.PI / 2; // Three.js Y-up mapping
            mesh.position.set(p.x, 0.085, p.z);
            this.chevronsGroup.add(mesh);
        }
    }

    /**
     * Animate rotating crystal, pulsing rings, and light column.
     * @param {number} time - elapsed time in seconds
     */
    animate(time) {
        if (this.goalBeaconGroup.visible) {
            // Spin diamond crystal
            if (this._goalCrystal) {
                this._goalCrystal.rotation.y = time * 2.0;
                this._goalCrystal.position.y = 1.6 + 0.15 * Math.sin(time * 3.0);
            }
            // Pulse light column
            if (this._goalLightColumn) {
                this._goalLightColumn.material.opacity = 0.25 + 0.15 * Math.sin(time * 4.0);
            }
            // Expand and pulse floor rings
            for (const item of this._goalFloorRings) {
                const phase = (time * 1.5 + item.index * 0.5) % 1.0;
                const scale = 0.7 + phase * 0.6;
                item.mesh.scale.set(scale, scale, scale);
                item.mesh.material.opacity = Math.max(0, 0.8 * (1.0 - phase));
            }
        }
    }

    _clearGroup(grp) {
        while (grp.children.length > 0) {
            const child = grp.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
                else child.material.dispose();
            }
            grp.remove(child);
        }
    }
}
