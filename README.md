# SteadyPath — Autonomous Warehouse AGV Dynamic Path Planning & 3D Simulation

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/ES6+-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?logo=three.js)](https://threejs.org/)
[![Tests](https://img.shields.io/badge/Tests-14%2F14%20Passing-brightgreen.svg)](#-testing--validation)

**SteadyPath** is a production-grade autonomous path planning, trajectory generation, and dynamic replanning engine for industrial **Autonomous Guided Vehicles (AGV)** operating in a $30\text{ m} \times 20\text{ m}$ warehouse environment.

Featuring an **interactive 3D WebGL Three.js simulation**, dual **JavaScript & Python** implementations, and an architectural interface ready for **Model Predictive Control (MPC)** and **ROS 2 Humble**.

---

## 📸 Key Capabilities

- **Interactive 3D WebGL Simulation**: Real-time rendering with orbital, top-down, chase/follow, and first-person POV cameras.
- **8-Directional Grid A\***: Sub-millisecond global search with octile distance heuristics and diagonal corner-cutting prevention.
- **3-Stage Path Smoother**:
  1. *Greedy raycast shortcutting* (line-of-sight pruning).
  2. *2-pass Chaikin corner-cutting subdivision* (continuous curves).
  3. *Uniform resolution resampling* with safety validation.
- **Curvature-Adaptive Velocity Profiling**: Smooth deceleration around sharp corners ($1.5\text{ m/s}$ straight down to $0.4\text{ m/s}$ for U-turns).
- **Dynamic Obstacle Replanning**: Detects runtime corridor blockages, re-routes from the vehicle's instantaneous pose, and flags U-turn maneuvers ($\Delta\psi \ge 120^\circ$).
- **Dual Runtime Support**: Full parallel implementations in **JavaScript (ESM)** and **Python 3.8+** (zero third-party dependencies required).
- **14 Automated Verification Suites**: Passing edge cases, obstacle clearance, narrow corridors, and trapped destinations.

---

## 🏛️ System Architecture

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

## 🚀 Quick Start Guide

You can run the interactive simulation using **Node.js** or **Python** without any complex build steps.

### Option A: Run via Node.js
```bash
# Clone the repository
git clone https://github.com/Rudraprathap-06/steady-path.git
cd steady-path

# Start local server
node server.js
# Or: npm start
```
Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.

### Option B: Run via Python (Zero Dependencies)
```bash
python server.py
```
Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.

---

## 🧪 Testing & Validation

Both the JavaScript and Python engines include identical 14-scenario automated test suites:

### Run JavaScript Tests (Node.js)
```bash
npm test
# Or: node src/tests/runNodeTests.js
```

### Run Python Tests
```bash
python tests/run_python_tests.py
```

### Test Scenarios Covered
| ID | Test Scenario | Expected Behavior |
| :--- | :--- | :--- |
| **T01** | Normal route Start $\to$ Goal | Generates collision-free path $> 0\text{ m}$ |
| **T02** | Different destination | Adapts to varied targets across warehouse |
| **T03** | Different start pose | Re-plans correctly from non-origin initial state |
| **T04** | Destination near boundary | Enforces vehicle safety inflation margin ($0.9\text{ m}$) |
| **T05** | Destination near obstacle | Respects rack clearance envelopes |
| **T06** | Primary route blocked | Triggers dynamic replan; finds alternate route |
| **T07** | Alternate route available | Bypasses road blockages cleanly |
| **T08** | Multiple roads blocked | Navigates complex blockage clusters |
| **T09** | U-turn required | Detects $\Delta\psi \ge 120^\circ$ and throttles speed |
| **T10** | Unreachable destination | Fails safely with `NO_PATH` status without crashing |
| **T11** | Narrow corridor navigation | Maintains precise inter-rack corridor clearance |
| **T12** | Blockage near vehicle | Handles immediate front-proximity obstructions |
| **T13** | Multiple simultaneous blockages | Re-routes through alternate warehouse aisles |
| **T14** | Path validation | Continuous point-to-point collision check |

---

## 📁 Repository Directory Structure

```
steady-path/
├── index.html                                   # Web GUI container for 3D & 2D simulation
├── server.js                                    # Native Node.js HTTP server (ESM)
├── server.py                                    # Zero-dependency Python HTTP server
├── package.json                                 # Node package definitions & test scripts
├── PROJECT_FILES_OVERVIEW.md                    # Detailed file-by-file documentation
├── css/
│   └── index.css                                # Dark-theme responsive styling & HUD layout
├── src/                                         # JavaScript Core Implementation
│   ├── main.js                                  # Application entrypoint & DOM controller
│   ├── config/config.js                         # Warehouse & vehicle physical constants
│   ├── interface/plannerInterface.js            # Frozen public API contract
│   ├── map/
│   │   ├── warehouseMap.js                      # Occupancy grid & spatial indexing
│   │   ├── staticObstacles.js                   # Racks, walls, pillars, loading zones
│   │   └── dynamicObstacles.js                  # Runtime blockage registry & AABB checks
│   ├── planner/
│   │   ├── astarPlanner.js                      # 8-direction A* algorithm with binary heap
│   │   ├── pathSmoother.js                      # Shortcut + Chaikin + Resampling
│   │   ├── pathValidator.js                     # Clearance & continuity checker
│   │   ├── trajectoryGenerator.js               # Heading & curvature velocity assignment
│   │   └── replanner.js                         # Dynamic state-aware replanning
│   ├── vehicle/vehicleState.js                  # AGV kinematic state model
│   ├── simulation/
│   │   ├── simulationEngine.js                  # Main simulation loop & state machine
│   │   └── simulationController.js              # Mouse click & mode dispatcher
│   ├── visualization/                           # 2D Canvas Renderers
│   ├── visualization3d/                         # 3D Three.js WebGL Renderers & Meshes
│   ├── vendor/three/                            # Three.js ESM runtime & OrbitControls
│   └── tests/                                   # JavaScript test runner
├── planner/                                     # Converted Python Subsystem
│   ├── __init__.py                              # Public package exports
│   ├── config.py                                # Configuration dataclasses
│   ├── astar_planner.py                         # Python A* algorithm with heapq
│   ├── path_smoother.py                         # Shortcut & Chaikin smoother
│   ├── path_validator.py                        # Collision & envelope auditor
│   ├── trajectory_generator.py                  # Trajectory & curvature profiler
│   ├── replanner.py                             # Dynamic replanner & U-turn detector
│   ├── planner_interface.py                     # Functional interface (plan, replan)
│   ├── route_planner.py                         # Unified RoutePlanner facade for MPC & ROS 2
│   └── map/                                     # Python warehouse map & obstacles
└── tests/                                       # Python Test Suite
    ├── test_planner_js_suite.py                 # 14 unit test scenarios
    └── run_python_tests.py                      # Python CLI runner
```

---

## 🧮 Mathematical Details

### 1. Octile Distance Heuristic
For an 8-connected grid with orthogonal step cost $1$ and diagonal step cost $\sqrt{2}$:
$$h(c_1, r_1, c_2, r_2) = \max(\Delta c, \Delta r) + (\sqrt{2} - 1) \min(\Delta c, \Delta r)$$

### 2. Vehicle Safety Inflation Envelope
Obstacle collision boundaries are inflated by:
$$R_{\text{inflate}} = \frac{W_{\text{vehicle}}}{2} + \text{Margin}_{\text{safety}} = \frac{1.2\text{ m}}{2} + 0.3\text{ m} = 0.90\text{ m}$$

### 3. Curvature & Speed Assignment
Curvature is estimated from sequential tangent headings:
$$\kappa_i = \frac{|\Delta\psi_i|}{\Delta s_i}$$
Desired velocity $v_i$ is mapped across curvature thresholds:
$$v = \begin{cases} 
1.5\text{ m/s} & \text{if } |\Delta\psi| < 30^\circ \text{ (Straight)} \\
1.0\text{ m/s} & \text{if } 30^\circ \le |\Delta\psi| < 60^\circ \text{ (Moderate Turn)} \\
0.6\text{ m/s} & \text{if } 60^\circ \le |\Delta\psi| < 120^\circ \text{ (Sharp Turn)} \\
0.4\text{ m/s} & \text{if } |\Delta\psi| \ge 120^\circ \text{ (U-Turn)} 
\end{cases}$$

---

## 🔗 Integration with MPC & ROS 2

The Python module [`planner/route_planner.py`](file:///c:/Users/rpsin/OneDrive/Desktop/MYPROJECT/planner/route_planner.py) provides a reference window extractor specifically designed for Model Predictive Control prediction horizons ($N=15$ steps):
```python
from planner import RoutePlanner

planner = RoutePlanner(default_velocity=1.5)
route = planner.plan(destination_id="DEST_BAY_01")

# Extract reference matrix [x_ref, y_ref, yaw_ref, v_ref] for MPC solver
ref_window = planner.get_reference_window(current_x=veh_x, horizon_steps=15, dt=0.05)
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
Author: **Rudraprathap (R.P. Singh)**
