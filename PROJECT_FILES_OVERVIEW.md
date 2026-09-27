# SteadyPath — Project Files & Architecture Directory

This document details the exact purpose, responsibility, inputs, outputs, and relationships of **every file** in the SteadyPath Autonomous Warehouse Path Planning & Replanning Project.

---

## 1. Project Overview & Architecture

SteadyPath simulates an **Autonomous Guided Vehicle (AGV)** navigating an industrial warehouse environment ($30\text{ m} \times 20\text{ m}$).

### Core Responsibility
- **The Path Planner decides WHERE the vehicle should travel and at WHAT desired speed.**
- **The Motion Controller (MPC / Stanley) decides HOW the vehicle executes that trajectory smoothly.**

```text
                                  USER INTERFACE / ROS 2
                                             │
                        Select Destination / Dynamic Blockage
                                             ▼
                                  ┌─────────────────────┐
                                  │   PLANNER INTERFACE │
                                  └──────────┬──────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
               ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
               │ WAREHOUSE MAP │     │   8-DIR A*    │     │ PATH SMOOTHER │
               │  - Static Obs │     │  - Octile Dist│     │  - Shortcut   │
               │  - Dynamic Blk│     │  - Corner-Cut │     │  - Chaikin    │
               │  - Inflation  │     │    Prevention │     │  - Resample   │
               └───────────────┘     └───────────────┘     └───────┬───────┘
                                                                   │
                                                                   ▼
                                                           ┌───────────────┐
                                                           │ PATH VALIDATOR│
                                                           │  - Clearance  │
                                                           │  - Continuous │
                                                           └───────┬───────┘
                                                                   │
                                                                   ▼
                                                           ┌───────────────┐
                                                           │  TRAJECTORY   │
                                                           │  - Tangent Yaw│
                                                           │  - Speed Prof │
                                                           └───────┬───────┘
                                                                   │
                                      ┌────────────────────────────┴───────────────────────────┐
                                      ▼                                                        ▼
                          ┌───────────────────────────┐                            ┌───────────────────────┐
                          │   SIMULATION ENGINE       │                            │    MPC / CONTROLLER   │
                          │   - Trajectory Follower   │                            │    - Horizon Window   │
                          │   - Dynamic Replanning    │                            │    - Steering/Throttle│
                          └─────────────┬─────────────┘                            └───────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 ┌──────────────┐              ┌──────────────┐
                 │  2D CANVAS   │              │   3D WEBGL   │
                 │  VIEWPORT    │              │   THREE.JS   │
                 └──────────────┘              └──────────────┘
```

---

## 2. Root Project Files

| File | Purpose & Responsibility |
| :--- | :--- |
| **`index.html`** | Main entrypoint for the browser web application. Contains HTML5 semantic structure, control sidebar, status panels, camera perspective toolbars, import maps for Three.js, and viewport canvases (`#webgl-container` and `#sim-canvas`). |
| **`package.json`** | Node.js package manifest defining metadata, dependencies (`three`), and npm run scripts (`npm start`, `npm run dev`, `npm test`). |
| **`package-lock.json`** | Exact dependency tree lockfile ensuring deterministic installs across environments. |
| **`server.js`** | Zero-dependency native Node.js HTTP server. Serves static files on port `3000` with strict MIME types required for modern ES Modules (`.mjs`, `.js`, `.woff2`, etc.). |
| **`server.py`** | Zero-dependency native Python alternative HTTP server (`http.server`). Allows running the exact same 3D web simulation without needing Node.js installed. |
| **`.gitignore`** | Configures Git to ignore `node_modules/`, Python bytecode (`__pycache__/`, `*.pyc`), virtual environments (`.venv/`), and OS temporary metadata (`.DS_Store`, `Thumbs.db`). |
| **`SteadyPath_Dynamic_Path_Planning_README.md`** | Comprehensive technical requirements specification document covering map layout, coordinate systems, A* requirements, smoothing math, speed profiling, and test scenarios. |

---

## 3. Styling & Presentation Layer

| File | Purpose & Responsibility |
| :--- | :--- |
| **`css/index.css`** | Complete dark-theme design system for the web interface. Defines CSS variables for warehouse color palettes, glassmorphism cards, responsive flex/grid layouts, telemetry typography, custom scrollbars, and toggle switch buttons. |

---

## 4. JavaScript Core Source Code (`src/`)

### Application Entrypoint
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/main.js`** | Orchestrates the web application lifecycle upon `DOMContentLoaded`. Instantiates the `SimulationEngine`, `SimulationController`, 2D renderers, and 3D WebGL scene. Wire taps DOM buttons, camera angle switches (Orbit, Top-Down, Follow, POV), log streams, resize observers, and telemetry displays. |

### Configuration (`src/config/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/config/config.js`** | Central configuration file. Defines physical warehouse dimensions ($30 \times 20\text{ m}$), grid resolution ($0.5\text{ m}$), vehicle dimensions ($1.2\text{ m}$ width, $2.0\text{ m}$ length, $0.3\text{ m}$ safety margin), speed thresholds ($1.5\text{ m/s}$ straight down to $0.4\text{ m/s}$ U-turn), and color hex codes. |

### Public Contract Interface (`src/interface/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/interface/plannerInterface.js`** | Frozen public API consumed by higher-level systems (MPC / ROS 2). Exposes `plan(currentState, destination, mapState)`, `replan(currentState, destination, updatedMapState)`, and `isCurrentPathBlocked(path, map, currentIndex)`. Ensures inputs and outputs conform to stable contracts. |

### Warehouse Environment & Obstacle Engine (`src/map/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/map/warehouseMap.js`** | Authoritative 2D spatial representation. Constructs the base occupancy grid, handles coordinate quantization (`worldToGrid`, `gridToWorld`), calculates inflated obstacle clearance ($0.9\text{ m}$ margin), tests boundaries, and provides expanding-ring free-cell snapping (`snapToFreeCell`). |
| **`src/map/staticObstacles.js`** | Factory functions defining all permanent warehouse structures: 6 pallet storage racks (`rack_01`–`rack_06`), 1 interior divider wall (`wall_01`), 2 structural pillars (`pillar_01`, `pillar_02`), 2 loading bays (`Load A`, `Load B`), and 1 restricted zone. |
| **`src/map/dynamicObstacles.js`** | Runtime blockage management. Allows adding, removing, and clearing temporary rectangular blockages (`addBlockage`, `removeBlockage`). Provides Axis-Aligned Bounding Box (AABB) intersection queries (`isBlocked`, `isRectBlocked`) used to trigger dynamic replanning. |

### Path Planning & Trajectory Engine (`src/planner/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/planner/astarPlanner.js`** | 8-connected grid A* pathfinding algorithm. Features octile distance heuristic, binary min-heap priority queue (`MinHeap`), and diagonal corner-cutting prevention so paths never slice across obstacle corners. |
| **`src/planner/pathSmoother.js`** | 3-stage path smoothing pipeline: (1) greedy line-of-sight raycast shortcutting to eliminate unnecessary grid zig-zags, (2) 2-pass Chaikin corner-cutting subdivision to round sharp turns, and (3) uniform distance resampling ($0.5\text{ m}$ steps) with safety fallback. |
| **`src/planner/pathValidator.js`** | Safety auditor. Evaluates polyline waypoints against warehouse walls, static obstacles, dynamic blockages, and vehicle inflation envelopes. Verifies path continuity by checking maximum allowable inter-waypoint gaps. |
| **`src/planner/trajectoryGenerator.js`** | Converts geometric paths into physical reference trajectories. Calculates tangent heading angles ($\psi = \text{atan2}(\Delta y, \Delta x)$) and computes curvature-dependent desired velocity profiles ($1.5\text{ m/s}$ straight down to $0.4\text{ m/s}$ on extreme turns, stopping at $0.0\text{ m/s}$ at destination). |
| **`src/planner/replanner.js`** | Dynamic replanning engine. Uses current vehicle pose as the new start and retains original destination as the goal. Evaluates heading difference to detect U-turn conditions ($\Delta\psi \ge 120^\circ$) and outputs an evasion trajectory avoiding newly placed blockages. |

### Vehicle & Simulation Loop (`src/vehicle/` & `src/simulation/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/vehicle/vehicleState.js`** | Kinematic vehicle state model holding position $(x, y)$, heading $(\psi)$, and current velocity $(v)$. Implements the Euler stepping method `moveToward(target, speed, dt)` for trajectory tracking. |
| **`src/simulation/simulationEngine.js`** | Core simulation state machine (`IDLE`, `PLANNING`, `MOVING`, `PAUSED`, `REPLANNING`, `BLOCKED`, `ARRIVED`). Manages continuous tick updates, actively monitors path clearance ahead of the vehicle, triggers replanning when blocked, and emits events to listeners. |
| **`src/simulation/simulationController.js`** | Connects UI interactions (canvas clicks, mode switches) to the simulation engine. Translates screen pixels to warehouse world meters (with Y-axis inversion) and handles button actions (Start, Pause, Reset, Random Destination). |

### 2D Canvas Visualization (`src/visualization/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/visualization/warehouseRenderer.js`** | Renders 2D top-down plan view of warehouse floors, grid lines, static storage racks, pillars, walls, loading zones, and dynamic blockage markers. |
| **`src/visualization/pathRenderer.js`** | Renders 2D path overlays: cyan raw A* path, green smoothed path, orange replanned trajectory, and destination target flag. |
| **`src/visualization/vehicleRenderer.js`** | Renders the 2D AGV chassis, orientation heading line, and velocity vector. |

### 3D WebGL Three.js Visualization (`src/visualization3d/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/visualization3d/coords3d.js`** | Maps 2D Cartesian warehouse coordinates $(x, y)$ to Three.js 3D space: $X_{3D} = x - 15$, $Z_{3D} = 10 - y$, $Y_{3D} = \text{height}$. |
| **`src/visualization3d/threeWarehouseScene.js`** | Master Three.js scene manager. Initializes WebGLRenderer, shadow maps, ambient/directional lights, ground floor textures, camera views (OrbitControls, Top-Down, Follow Chase Camera, First-Person POV), and raycasting click detection. |
| **`src/visualization3d/warehouseMeshBuilder.js`** | Procedurally builds 3D warehouse geometry: concrete floor grid, outer walls, 3D multi-tier industrial storage racks with orange frame uprights and shelving, structural concrete columns, and loading bay floor decals. |
| **`src/visualization3d/vehicle3d.js`** | Constructs the 3D AGV vehicle model: yellow industrial chassis, rubber drive wheels, top-mounted scanning LiDAR turret, and flashing hazard warning beacon. Smoothly interpolates vehicle position and yaw in 3D. |
| **`src/visualization3d/path3d.js`** | Renders glowing 3D tubular ribbons on the warehouse floor for nominal routes, replanned detours, and animated destination target beacons. |
| **`src/visualization3d/blockage3d.js`** | Renders dynamic road blockages as 3D construction barricades with diagonal reflective warning stripes and hazard warning lights. |

### Third-Party Vendors (`src/vendor/three/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/vendor/three/three.module.js`** | Official Three.js library packaged as an ES Module (ESM) for zero-build, native browser import. |
| **`src/vendor/three/OrbitControls.js`** | Three.js orbit controls add-on enabling smooth mouse dragging, panning, rotating, and zooming in 3D space. |

### Automated Tests (`src/tests/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| **`src/tests/testRunner.js`** | Automated browser and CLI test runner implementing 14 rigorous test scenarios (T01: Normal Route, T06: Route Blocked, T09: U-Turn, T10: Unreachable Destination, T14: Obstacle Clearance). |
| **`src/tests/runNodeTests.js`** | Node.js CLI script that executes `testRunner.js` in a headless environment and exits with code 0 (pass) or 1 (fail) for CI/CD pipelines (`npm test`). |

---

## 5. Converted Python Subsystem (`planner/` & `tests/`)

The full JavaScript planning engine has been converted into an idiomatic, zero-dependency Python package designed for seamless GitHub integration into the collaborative AGV project (`SteadyPath`).

```
planner/
├── __init__.py                  # Public exports: RoutePlanner, WarehouseMap, plan, replan, etc.
├── config.py                    # Python configuration dataclasses (Warehouse, Vehicle, Speeds)
├── astar_planner.py             # 8-direction A* algorithm with heapq & corner-cut protection
├── path_smoother.py             # Shortcut + Chaikin + equidistant resampling
├── path_validator.py            # Safety auditor (vehicle inflation, boundaries, connectivity)
├── trajectory_generator.py      # Tangent yaw, curvature κ, arc length s, velocity profiles
├── replanner.py                 # Dynamic replanning from current state & U-turn detection
├── planner_interface.py         # Functional frozen contract (plan, replan, is_current_path_blocked)
├── route_planner.py             # Unified RoutePlanner facade (backward & forward compatible)
└── map/
    ├── __init__.py
    ├── static_obstacles.py      # Racks, walls, pillars, loading/restricted zones
    ├── dynamic_obstacles.py     # Runtime blockage registry & AABB queries
    └── warehouse_map.py         # 2D occupancy grid & coordinate transforms
```

| Python File | Converted From | Purpose & Contract |
| :--- | :--- | :--- |
| **`planner/config.py`** | `src/config/config.js` | Typed frozen dataclasses: `WarehouseDimensions`, `PlannerSettings`, `VehicleDimensions`, `SpeedProfile`, and `SimulationSettings`. |
| **`planner/map/static_obstacles.py`** | `src/map/staticObstacles.js` | Returns lists of `ObstacleRect` bounding boxes matching the exact warehouse layout. |
| **`planner/map/dynamic_obstacles.py`** | `src/map/dynamicObstacles.js` | `DynamicObstacles` manager storing `DynamicBlockage` objects and performing AABB queries. |
| **`planner/map/warehouse_map.py`** | `src/map/warehouseMap.js` | `WarehouseMap` class. Builds a 2D occupancy grid with vehicle inflation ($0.9\text{ m}$) using zero-dependency pure Python lists, with optional NumPy acceleration if available. |
| **`planner/astar_planner.py`** | `src/planner/astarPlanner.js` | `astar_plan()` function using standard library `heapq`, octile distance, and corner-cutting prevention. |
| **`planner/path_smoother.py`** | `src/planner/pathSmoother.js` | `smooth_path()` implementing greedy raycast shortcutting, Chaikin corner-cutting, and uniform resampling. |
| **`planner/path_validator.py`** | `src/planner/pathValidator.js` | `validate_path()` and `is_segment_clear()` verifying boundary envelopes and safety buffers. |
| **`planner/trajectory_generator.py`** | `src/planner/trajectoryGenerator.js` | `generate_trajectory()` calculating yaw ($\psi$), curvature ($\kappa$), arc length ($s$), and curvature-adaptive speeds. |
| **`planner/replanner.py`** | `src/planner/replanner.js` | `dynamic_replan()` executing state-aware rerouting, obstacle evasion, and U-turn speed capping. |
| **`planner/planner_interface.py`** | `src/interface/plannerInterface.js` | Functional API contract: `plan()`, `replan()`, `is_current_path_blocked()`. |
| **`planner/route_planner.py`** | New unified integration facade | Provides `RoutePlanner` class, `PlannedRoute`, and `Waypoint`. Exposes `.plan()` and `.get_reference_window()` for MPC prediction horizons, fully satisfying `integrate.py`, `visualize_simulation.py`, and ROS 2 Humble nodes. |
| **`planner/__init__.py`** | Package manifest | Exports all public classes, functions, and config singletons. |
| **`tests/test_planner_js_suite.py`** | `src/tests/testRunner.js` | Python `unittest.TestCase` porting all 14 JavaScript verification scenarios (T01–T14) with equivalent assertions. |
| **`tests/run_python_tests.py`** | `src/tests/runNodeTests.js` | Standalone Python CLI test runner that executes the 14-test suite and exits with code 0 or 1. |

---

## 6. How the Subsystems Connect

```text
1. BROWSER GUI WORKFLOW:
   index.html ──► src/main.js ──► src/simulation/simulationEngine.js
                                        │
                                        ├──► src/interface/plannerInterface.js (plan / replan)
                                        │          │
                                        │          ├──► src/planner/astarPlanner.js
                                        │          ├──► src/planner/pathSmoother.js
                                        │          └──► src/planner/trajectoryGenerator.js
                                        │
                                        ├──► src/vehicle/vehicleState.js (vehicle movement)
                                        └──► src/visualization3d/threeWarehouseScene.js (render 3D)

2. PYTHON / ROS 2 / MPC WORKFLOW:
   integrate.py / ROS 2 ──► planner/route_planner.py (RoutePlanner)
                                 │
                                 ├──► planner/planner_interface.py (plan / replan)
                                 │          │
                                 │          ├──► planner/astar_planner.py
                                 │          ├──► planner/path_smoother.py
                                 │          └──► planner/trajectory_generator.py
                                 │
                                 └──► planner.get_reference_window() ──► mpc/mpc_controller.py
```

---

## 7. Quick Commands

| Task | Command |
| :--- | :--- |
| **Run Web 3D Simulation (Node.js)** | `npm start` or `node server.js` |
| **Run Web 3D Simulation (Python)** | `python server.py` |
| **Run JavaScript Tests** | `npm test` or `node src/tests/runNodeTests.js` |
| **Run Python Tests** | `python tests/run_python_tests.py` |
| **Run Master Python Simulation** | `python integrate.py --scenario normal` |
