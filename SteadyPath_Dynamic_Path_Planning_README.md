# SteadyPath — Dynamic Path Planning & Replanning Module

## 1. Project Overview

Build a complete interactive simulation for the **SteadyPath autonomous warehouse vehicle**.

This module is responsible for:

- Warehouse map representation
- 2D coordinate system
- Multi-route warehouse road network
- Runtime destination selection
- A* global path planning
- Collision-free path generation
- Path smoothing
- Reference trajectory generation
- Dynamic obstacle/blockage handling
- Dynamic path replanning
- Alternate route selection
- U-turn handling when required
- MPC integration interface
- Visualization and simulation controls
- Testing and debugging tools

### Core responsibility

The planner decides:

> **WHERE the vehicle should travel.**

The MPC decides:

> **HOW the vehicle should safely and smoothly travel along that route.**

Do NOT implement the MPC controller inside this module.

---

# 2. System Architecture

The overall system must follow this architecture:

```text
                         USER
                          │
                          │ Select destination
                          ▼
                ┌─────────────────────┐
                │  PATH PLANNER       │
                │                     │
                │  Current State      │
                │       +             │
                │  Destination        │
                │       +             │
                │  Warehouse Map      │
                └──────────┬──────────┘
                           │
                           ▼
                     ┌───────────┐
                     │    A*     │
                     │  Planner  │
                     └─────┬─────┘
                           │
                           ▼
                    Raw Global Path
                           │
                           ▼
                   ┌──────────────┐
                   │ Path          │
                   │ Smoothing     │
                   └──────┬───────┘
                          │
                          ▼
                Reference Trajectory
                          │
                          ▼
             [x, y, heading, speed]
                          │
                          ▼
                    ┌──────────┐
                    │   MPC    │
                    └────┬─────┘
                         │
                         ▼
                      Vehicle
```

---

# 3. Dynamic Replanning Architecture

The planner must support route changes.

```text
Vehicle
   │
   ▼
Current Route
   │
   │
   ├────────────── 🚧 BLOCKED
   │
   ▼
Obstacle Detection / Blockage Event
   │
   ▼
Dynamic Replanning
   │
   ├── Current vehicle position = NEW START
   │
   └── Original destination = SAME GOAL
   │
   ▼
A*
   │
   ▼
Alternate Route
   │
   ▼
Path Smoothing
   │
   ▼
Reference Trajectory
   │
   ▼
MPC
   │
   ▼
Vehicle continues
```

---

# 4. Coordinate System

Use a fixed Cartesian coordinate system.

## Units

All distances:

```text
meters
```

Velocity:

```text
meters/second
```

Angles:

```text
radians
```

## Coordinate convention

```text
             +Y
              ↑
              │
              │
              │
              └──────────────→ +X
             (0,0)
```

Origin:

```text
(0, 0)
```

The coordinate system must remain consistent across:

- Warehouse map
- A*
- Path smoothing
- Vehicle simulation
- Reference trajectory
- MPC interface

Never silently convert between different units.

---

# 5. Warehouse Dimensions

Create a configurable warehouse.

Default:

```text
Width  = 30 meters
Height = 20 meters
```

The dimensions must NOT be hardcoded throughout the application.

Store them in a central configuration.

Example:

```javascript
const WAREHOUSE = {
    width: 30,
    height: 20
};
```

---

# 6. Warehouse Environment

The warehouse should contain:

### Static elements

- Outer warehouse boundaries
- Roads / drivable areas
- Storage racks
- Walls
- Pillars
- Loading zones
- Restricted zones
- Static obstacles

### Dynamic elements

- Temporary road blockages
- Temporary obstacles
- Blocked corridors
- Dynamic obstacles used to trigger replanning

---

# 7. Multi-Route Road Network

Do NOT create a single road from start to destination.

The warehouse must contain:

- Intersections
- Branches
- Alternate corridors
- Dead ends
- U-turn areas
- Multiple paths between major areas

Example:

```text
                  ┌───────────────┐
                  │               │
START ────────────┤               ├──────── GOAL
       │          │               │
       │          └───────────────┘
       │
       └──────────────────────────────
```

There must be multiple possible routes between different locations.

This is essential for demonstrating dynamic replanning.

---

# 8. Warehouse Map Representation

Represent the map programmatically.

The map should contain:

- Warehouse dimensions
- Obstacles
- Drivable areas
- Roads
- Intersections
- Dynamic blockages

Use a clear data structure.

Example:

```javascript
const warehouseMap = {
    width: 30,
    height: 20,

    obstacles: [
        {
            id: "rack_01",
            type: "rack",
            x: 5,
            y: 5,
            width: 4,
            height: 8
        }
    ],

    roads: [
        ...
    ],

    dynamicObstacles: [
        ...
    ]
};
```

Do not duplicate map coordinates across multiple files.

There must be one authoritative map representation.

---

# 9. Vehicle Representation

Represent the vehicle using:

```text
x
y
heading
velocity
```

Example:

```javascript
const vehicleState = {
    x: 2,
    y: 2,
    heading: 0,
    velocity: 0
};
```

The vehicle must be visible in the simulation.

Display:

- Vehicle body
- Direction/heading indicator
- Current X/Y coordinates
- Current velocity

---

# 10. Runtime Destination Selection

The user must be able to select a destination during runtime.

Do NOT hardcode one destination.

The user should be able to:

1. Click on a valid drivable location.
2. Convert the click to warehouse coordinates.
3. Validate the selected location.
4. Set it as the goal.
5. Run A* from the vehicle's current position.
6. Display the generated route.

Example:

```text
User clicks:
(24.2, 16.7)

↓

Goal = (24.2, 16.7)

↓

A*(currentPosition, goal)

↓

New route
```

If the selected location is invalid or blocked:

```text
Destination unavailable.
Please select a reachable location.
```

Do not generate an invalid path.

---

# 11. A* Path Planning

Implement the A* algorithm.

Function concept:

```javascript
planPath(start, goal, map)
```

Input:

- start
- goal
- warehouse map

Output:

- raw path

Example:

```javascript
[
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    ...
]
```

The algorithm must:

- Search only valid/drivable areas.
- Avoid static obstacles.
- Avoid dynamic blocked areas.
- Stay inside warehouse boundaries.
- Return a valid connected path.
- Detect unreachable destinations.
- Never return a path through an obstacle.

If no route exists:

```text
No valid path found.
```

Do not fabricate a path.

---

# 12. A* Grid

Use a configurable planning resolution.

Default:

```text
GRID_RESOLUTION = 0.5 meters
```

Therefore:

```text
30m × 20m
```

becomes:

```text
60 × 40 grid cells
```

Make the resolution configurable.

Example:

```javascript
const PLANNER_CONFIG = {
    gridResolution: 0.5
};
```

---

# 13. A* Movement

At minimum support:

- Up
- Down
- Left
- Right

Preferably also support diagonal movement:

- Up-left
- Up-right
- Down-left
- Down-right

If diagonal movement is supported, prevent corner cutting.

The vehicle must not be allowed to move diagonally between two touching obstacles.

---

# 14. Vehicle Footprint / Safety Margin

The planner must account for vehicle size.

Do not plan paths that technically pass through an obstacle but leave no physical clearance.

Create configurable parameters:

```javascript
const VEHICLE_CONFIG = {
    width: 1.2,
    length: 2.0,
    safetyMargin: 0.3
};
```

Obstacle collision checking should consider:

```text
vehicle footprint + safety margin
```

This creates an effective obstacle inflation region.

---

# 15. Path Validation

Every generated path must be validated.

Check:

### Boundary

The entire path must remain inside the warehouse.

### Static obstacles

The path must not intersect:

- Racks
- Walls
- Pillars
- Restricted areas

### Dynamic obstacles

The path must not intersect currently blocked areas.

### Connectivity

All consecutive path points must be connected.

### Vehicle clearance

The vehicle must have sufficient space to travel.

If validation fails:

```text
INVALID PATH
```

The planner should either:

1. Replan, or
2. Report that no valid path exists.

---

# 16. Path Smoothing

Raw A* paths may contain unnecessary zig-zags.

Implement path smoothing.

Example raw path:

```text
●
│
│
└─────┐
      │
      └──────┐
             │
             ●
```

After smoothing:

```text
●
 ╲
  ╲
   ╲─────────╮
             ╲
              ●
```

The smoothing algorithm must NOT:

- Cross obstacles
- Leave the warehouse
- Remove necessary turns
- Create an unreachable path

Always run collision validation after smoothing.

If smoothing makes the path invalid, retain the safe path or use a safer smoothing method.

---

# 17. Heading Generation

For every trajectory point calculate vehicle heading.

Use:

```text
heading = atan2(dy, dx)
```

Heading must be in radians.

Example:

```text
0 rad       → +X direction
π/2 rad     → +Y direction
π rad       → -X direction
-π/2 rad    → -Y direction
```

Heading must change continuously where possible.

---

# 18. Desired Speed Generation

Generate a desired velocity for each trajectory point.

Units:

```text
m/s
```

Use lower speeds around:

- Sharp turns
- Intersections
- Narrow corridors
- U-turns
- Obstacle areas

Example configurable values:

```text
Straight section → 1.5 m/s
Moderate turn    → 1.0 m/s
Sharp turn       → 0.6 m/s
U-turn           → 0.4 m/s
```

These values must be configurable.

Do NOT implement acceleration or steering control.

Only provide the desired reference speed.

---

# 19. Reference Trajectory

The final planner output must have exactly this logical structure:

```text
[
    x,
    y,
    heading,
    desired_speed
]
```

Example:

```javascript
[
    {
        x: 2.0,
        y: 2.0,
        heading: 0.0,
        desiredSpeed: 1.5
    },
    {
        x: 3.0,
        y: 2.0,
        heading: 0.0,
        desiredSpeed: 1.5
    },
    {
        x: 4.0,
        y: 2.5,
        heading: 0.46,
        desiredSpeed: 1.0
    }
]
```

This is the primary output consumed by MPC.

---

# 20. Frozen Planner Interface

Create ONE public planner interface.

Conceptually:

```javascript
planner.plan(
    currentState,
    destination,
    mapState
)
```

Input:

```javascript
currentState = {
    x,
    y,
    heading,
    velocity
};
```

```javascript
destination = {
    x,
    y
};
```

Output:

```javascript
{
    success: true,
    path: [...],
    trajectory: [...]
}
```

If no path exists:

```javascript
{
    success: false,
    reason: "NO_PATH",
    path: [],
    trajectory: []
}
```

The interface must be documented.

After the interface is finalized, do not change its structure without explicit approval.

---

# 21. Dynamic Replanning

Implement dynamic replanning.

The planner must support:

```text
Current vehicle position
+
Existing destination
+
Updated obstacle map
```

When a blockage occurs:

```text
OLD PATH
   ↓
BLOCKED
   ↓
GET CURRENT VEHICLE POSITION
   ↓
KEEP ORIGINAL GOAL
   ↓
UPDATE MAP
   ↓
RUN A*
   ↓
GENERATE ALTERNATE PATH
   ↓
SMOOTH
   ↓
GENERATE NEW TRAJECTORY
   ↓
SEND TO MPC
```

---

# 22. Important Replanning Rule

When replanning:

### Start

Must be:

```text
CURRENT VEHICLE POSITION
```

NOT the original starting point.

### Goal

Must remain:

```text
USER'S ORIGINAL DESTINATION
```

unless the user explicitly selects a new destination.

Example:

```text
Original:

START A → GOAL D

Vehicle currently at:

POSITION B

Road becomes blocked.

Replanning:

START = B
GOAL  = D
```

Do NOT restart from A.

---

# 23. Dynamic Blockage Simulation

The simulation must allow the user to create/remove blockages.

Provide controls such as:

```text
[ Add Blockage ]
[ Remove Blockage ]
[ Clear All Blockages ]
```

Preferred interaction:

1. User clicks a road segment.
2. The road becomes blocked.
3. A visible 🚧 marker appears.
4. Planner detects the blockage.
5. Replanning begins.
6. New route is displayed.

---

# 24. Replanning Trigger

A replanning event can happen when:

1. A dynamic obstacle appears on the current path.
2. A road segment becomes unavailable.
3. The current path becomes invalid.
4. The vehicle approaches a blocked segment.

The system should avoid unnecessary replanning when the current route remains valid.

---

# 25. Alternate Route Selection

If the original route becomes blocked, A* should naturally search for another valid route.

Example:

```text
             ┌───────────────┐
             │               │
START ───────┤               ├──── GOAL
             │               │
             └───────────────┘
```

If the upper route becomes blocked:

```text
             🚧 BLOCKED
             ┌───────────────┐
             │               │
START ───────┤               ├──── GOAL
             │
             │
             └──────────────────── GOAL
```

The vehicle should use the lower route.

---

# 26. U-Turn Handling

The planner must allow routes that require the vehicle to turn around.

Example:

```text
Vehicle
   ↓
   ↓
   ↓
 DEAD END
   │
   └────── U-TURN
              ↓
              ↓
        Alternate corridor
```

A U-turn must be represented by valid path points and headings.

Do not teleport the vehicle or instantly rotate it.

The route should physically contain the necessary turn-around geometry.

---

# 27. Simulation

Create an interactive simulation UI.

The UI should show:

### Warehouse

- Boundary
- Roads
- Racks
- Walls
- Pillars
- Loading zones

### Vehicle

- Current position
- Heading
- Movement

### Route

Display:

- Raw A* path
- Smoothed path
- Current reference trajectory

---

# 28. Destination Interaction

Allow the user to click a valid location.

Display:

```text
Destination:
X = 24.2 m
Y = 16.7 m
```

Then automatically:

```text
Plan Route
```

Provide a button as well:

```text
[Plan Route]
```

---

# 29. Simulation Controls

Provide:

```text
[ Start ]
[ Pause ]
[ Resume ]
[ Reset ]
[ Plan Route ]
[ Add Blockage ]
[ Clear Blockages ]
```

Optional:

```text
[ Random Destination ]
[ Random Obstacle ]
[ Replan ]
```

---

# 30. Information Panel

Display real-time information:

```text
Vehicle Position
X: 12.42 m
Y: 8.31 m

Heading:
1.21 rad

Velocity:
0.84 m/s

Destination:
24.20, 16.70

Planner Status:
ROUTE ACTIVE

Path Length:
32.4 m

Planning Time:
8.4 ms

Replanning:
NO
```

When blocked:

```text
Planner Status:
REPLANNING

Reason:
CURRENT ROUTE BLOCKED

New Route:
FOUND
```

If impossible:

```text
Planner Status:
NO PATH

Reason:
DESTINATION UNREACHABLE
```

---

# 31. Route Visualization

Show:

### Current vehicle

A vehicle icon/rectangle with a heading arrow.

### Goal

Use a visible goal marker.

### Planned path

Display the complete planned route.

### Current trajectory

Highlight the active trajectory.

### Blockage

Display a clear visual barrier or 🚧 marker.

### Replanned route

Clearly distinguish the new route from the old route.

---

# 32. MPC Integration

Do not implement MPC inside this module.

Create a clean adapter/interface.

Conceptually:

```javascript
const trajectory = planner.plan(
    currentState,
    destination,
    mapState
);
```

Then:

```javascript
mpc.followTrajectory(
    trajectory
);
```

The planner must NOT implement:

- Steering
- Acceleration
- Throttle
- Brake
- Vehicle dynamics
- MPC optimization

These belong to the MPC/controller layer.

---

# 33. Separation of Responsibilities

## Planner owns

- Warehouse map
- Global route
- A*
- Obstacle avoidance
- Path smoothing
- Destination handling
- Replanning
- Reference trajectory
- Route validity

## MPC owns

- Vehicle dynamics
- Steering
- Acceleration
- Braking
- Tracking error
- Local control
- Smooth vehicle motion

## Visualization owns

- Rendering
- Animation
- UI
- User interaction

Do not mix these responsibilities.

---

# 34. What NOT to Implement

Do NOT:

- Build MPC.
- Implement steering control.
- Implement acceleration control.
- Hardcode Start → Goal routes.
- Hardcode a single destination.
- Create separate routes for each destination.
- Put vehicle physics inside A*.
- Make A* depend on 3D graphics.
- Make the planner depend on a rendering library.
- Change units between modules.
- Return different trajectory formats.
- Teleport the vehicle during a U-turn.
- Allow paths through obstacles.
- Restart replanning from the original starting point.
- Stop permanently when an alternate route exists.
- Couple planner internals to MPC internals.

---

# 35. Error Handling

The planner must explicitly handle:

### Invalid destination

```text
Destination outside warehouse.
```

### Destination inside obstacle

```text
Destination is blocked.
```

### Unreachable destination

```text
No valid route exists.
```

### Invalid start

```text
Current vehicle position is invalid.
```

### Blocked current route

```text
Replanning required.
```

### No alternate route

```text
No alternate route available.
```

Never silently fail.

---

# 36. Testing Requirements

Test at least 10 scenarios.

## Test 1

Normal route:

```text
Start → Goal
```

## Test 2

Different destination.

## Test 3

Different starting position.

## Test 4

Destination near warehouse boundary.

## Test 5

Destination near obstacle.

## Test 6

Primary route blocked.

## Test 7

Alternate route available.

## Test 8

Multiple roads blocked.

## Test 9

U-turn required.

## Test 10

Destination completely unreachable.

Additional tests should include:

- Narrow corridor
- Obstacle near intersection
- Blockage appearing near vehicle
- Blockage appearing far ahead
- Multiple simultaneous blockages
- Replanning multiple times
- Reset and replan
- Different grid resolutions

---

# 37. Acceptance Criteria

The module is considered complete only when:

### Map

- [ ] Warehouse is represented in meters.
- [ ] Coordinate system is documented.
- [ ] Static obstacles are represented.
- [ ] Multiple routes exist.
- [ ] Map is configurable.

### A*

- [ ] A* is implemented.
- [ ] Start is dynamic.
- [ ] Goal is dynamic.
- [ ] Obstacles are respected.
- [ ] Unreachable goals are detected.

### Runtime

- [ ] User can select any valid destination.
- [ ] New route is generated.
- [ ] Route is displayed.

### Smoothing

- [ ] A* path is smoothed.
- [ ] Smoothed path remains collision-free.

### Trajectory

- [ ] X is in meters.
- [ ] Y is in meters.
- [ ] Heading is in radians.
- [ ] Desired speed is in m/s.

### Replanning

- [ ] Dynamic blockage can be introduced.
- [ ] Current route becomes invalid.
- [ ] Planner detects blockage.
- [ ] Current vehicle position becomes new start.
- [ ] Original destination remains the goal.
- [ ] A new route is generated.
- [ ] Alternate route is displayed.
- [ ] U-turns can be handled.

### Integration

- [ ] Planner has one stable interface.
- [ ] MPC can consume the trajectory.
- [ ] Planner does not contain MPC logic.

### Testing

- [ ] At least 10 scenarios tested.
- [ ] No path through obstacles.
- [ ] No invalid coordinates.
- [ ] No unexplained planner failures.

---

# 38. Recommended Project Structure

Adapt this to the existing SteadyPath project rather than blindly creating a new project.

```text
src/
│
├── planner/
│   ├── AStarPlanner
│   ├── PathSmoother
│   ├── PathValidator
│   ├── Replanner
│   └── TrajectoryGenerator
│
├── map/
│   ├── WarehouseMap
│   ├── StaticObstacles
│   └── DynamicObstacles
│
├── vehicle/
│   └── VehicleState
│
├── simulation/
│   ├── SimulationEngine
│   └── SimulationController
│
├── visualization/
│   ├── WarehouseRenderer
│   ├── PathRenderer
│   └── VehicleRenderer
│
├── interface/
│   └── PlannerInterface
│
├── config/
│   └── plannerConfig
│
└── tests/
    ├── AStarTests
    ├── CollisionTests
    ├── SmoothingTests
    ├── ReplanningTests
    └── IntegrationTests
```

---

# 39. Important Development Rule

Before changing the existing project:

1. Analyze the complete existing repository.
2. Identify the existing framework.
3. Identify existing vehicle/MPC code.
4. Identify existing map/visualization code.
5. Identify existing data structures.
6. Reuse existing components wherever possible.
7. Do NOT overwrite working MPC code.
8. Do NOT create duplicate implementations.
9. Integrate into the existing architecture.

If an existing implementation already performs part of this functionality, improve/reuse it rather than creating a competing implementation.

---

# 40. Development Sequence

Implement in this exact order:

```text
PHASE 1
Warehouse map
        ↓
PHASE 2
Road network
        ↓
PHASE 3
Grid representation
        ↓
PHASE 4
A*
        ↓
PHASE 5
Runtime destination
        ↓
PHASE 6
Collision validation
        ↓
PHASE 7
Path smoothing
        ↓
PHASE 8
Reference trajectory
        ↓
PHASE 9
Frozen planner interface
        ↓
PHASE 10
Dynamic obstacles
        ↓
PHASE 11
Dynamic replanning
        ↓
PHASE 12
U-turn / alternate route
        ↓
PHASE 13
MPC integration
        ↓
PHASE 14
Testing
        ↓
PHASE 15
Documentation / cleanup
```

Do not attempt to implement all features simultaneously.

After each phase, verify that the previous phase still works.

---

# 41. Performance Requirements

The planner should be suitable for interactive simulation.

Target:

```text
Normal A* planning:
< 100 ms

Typical replanning:
< 100 ms
```

The exact performance depends on map resolution and implementation.

Do not sacrifice collision safety simply to achieve lower planning time.

---

# 42. Planner Logging

Provide useful logs.

Example:

```text
[PLANNER] New destination: (24.2, 16.7)

[PLANNER] Start: (2.0, 2.0)

[PLANNER] Running A*

[PLANNER] Path found

[PLANNER] Raw path points: 87

[PLANNER] Smoothed path points: 24

[PLANNER] Trajectory generated

[PLANNER] Route length: 31.4 m
```

When blocked:

```text
[REPLANNER] Current route blocked

[REPLANNER] Current position: (12.4, 8.3)

[REPLANNER] Original goal: (24.2, 16.7)

[REPLANNER] Running A*

[REPLANNER] Alternate route found

[REPLANNER] New path length: 18.7 m
```

---

# 43. Final Planner API

The final system should conceptually expose:

```javascript
planner.plan(
    currentState,
    destination,
    mapState
);
```

And:

```javascript
planner.replan(
    currentState,
    destination,
    updatedMapState
);
```

The returned object should follow one consistent structure:

```javascript
{
    success: true,

    status: "PATH_FOUND",

    path: [
        {
            x: 2.0,
            y: 2.0
        }
    ],

    trajectory: [
        {
            x: 2.0,
            y: 2.0,
            heading: 0.0,
            desiredSpeed: 1.5
        }
    ],

    metadata: {
        pathLength: 31.4,
        planningTimeMs: 8.5,
        replanned: false
    }
}
```

For failure:

```javascript
{
    success: false,

    status: "NO_PATH",

    path: [],

    trajectory: [],

    metadata: {
        pathLength: 0,
        planningTimeMs: 0,
        replanned: false
    }
}
```

Do not change this structure randomly between calls.

---

# 44. Final Demonstration Scenario

The final simulation must demonstrate the following exact scenario:

## Step 1

Vehicle starts at:

```text
(2, 2)
```

## Step 2

User clicks any valid destination, for example:

```text
(25, 17)
```

## Step 3

Planner runs:

```text
A*
```

## Step 4

Planner generates:

```text
Raw path
```

## Step 5

Planner smooths it.

## Step 6

Planner generates:

```text
[x, y, heading, desired_speed]
```

## Step 7

MPC receives the trajectory.

## Step 8

Vehicle starts moving.

## Step 9

A road ahead becomes blocked:

```text
🚧
```

## Step 10

Planner detects:

```text
CURRENT ROUTE INVALID
```

## Step 11

Planner takes:

```text
CURRENT VEHICLE POSITION
```

as the new start.

## Step 12

Planner keeps:

```text
ORIGINAL DESTINATION
```

as the goal.

## Step 13

A* finds an alternate route.

## Step 14

Planner smooths the alternate route.

## Step 15

New trajectory is sent to MPC.

## Step 16

Vehicle continues toward the original destination.

This complete sequence must work without modifying the code or hardcoding a special route for the demonstration.

---

# 45. Final Deliverables

At the end of development provide:

1. Working warehouse simulation
2. Warehouse map
3. Multi-route road network
4. A* implementation
5. Runtime destination selection
6. Collision checking
7. Path smoothing
8. Reference trajectory generator
9. Dynamic obstacle system
10. Dynamic replanning
11. Alternate route handling
12. U-turn handling
13. Stable planner/MPC interface
14. Automated tests
15. Documentation
16. Demo scenario

---

# 46. Final Responsibility Definition

The responsibility boundary is:

```text
                    USER
                     │
                     ▼
              Select destination
                     │
                     ▼
             ┌───────────────┐
             │ R.P. PLANNER  │
             │               │
             │ Warehouse Map │
             │      ↓        │
             │      A*       │
             │      ↓        │
             │   Smoothing   │
             │      ↓        │
             │ Trajectory    │
             └───────┬───────┘
                     │
                     │
           x, y, heading, speed
                     │
                     ▼
                ┌─────────┐
                │   MPC   │
                └────┬────┘
                     │
                     ▼
                  Vehicle
```

The most important rule is:

> **R.P. Singh's module determines the global route. MPC determines the vehicle control required to follow that route.**

Do not mix these responsibilities.

---

# 47. Antigravity Implementation Instructions

Before writing code, analyze the existing SteadyPath repository completely.

Determine:

- Existing framework
- Existing language
- Existing simulation
- Existing vehicle model
- Existing MPC implementation
- Existing map representation
- Existing UI
- Existing coordinate system
- Existing APIs
- Existing dependencies

Then implement this specification **inside the existing architecture**.

Do not unnecessarily rewrite working components.

Build the system incrementally and verify each phase before moving to the next.

The final result must be a **working interactive simulation**, not only a collection of planner functions.

The user must be able to:

1. Start the simulation.
2. See the warehouse.
3. See the vehicle.
4. Click any valid destination.
5. See A* generate a route.
6. See the smoothed route.
7. See the vehicle follow the route.
8. Add a road blockage.
9. See the planner detect the blockage.
10. See the planner replan from the vehicle's current position.
11. See an alternate route generated.
12. See the vehicle continue toward the original destination.
13. Repeat the process with different destinations and blockages.

Do not consider the task complete until this end-to-end behavior works.

---

# 48. Antigravity Working Rules

Follow these rules while implementing:

### Rule 1 — Analyze first

Do not immediately modify files.

First inspect the complete repository and identify the existing architecture.

### Rule 2 — Preserve working code

Do not replace existing MPC, vehicle, UI, or simulation code unless necessary.

### Rule 3 — Build incrementally

Implement one phase at a time.

After each phase:

- Run the project.
- Check for errors.
- Test the feature.
- Fix regressions.
- Continue only after verification.

### Rule 4 — No hardcoded demo route

The demonstration must use the same dynamic planner as the normal simulation.

Do not create a special route just for the demo.

### Rule 5 — No hardcoded destination

Any valid destination selected by the user must be supported.

### Rule 6 — No fake replanning

When a blockage occurs, actually rerun the planner using:

```text
current vehicle position → original goal
```

Do not simply switch between precomputed routes.

### Rule 7 — Keep units consistent

Use:

```text
distance = meters
velocity = m/s
angle = radians
```

throughout the planner/MPC interface.

### Rule 8 — Validate every path

A route is valid only if it:

- stays inside the warehouse,
- avoids obstacles,
- respects vehicle clearance,
- is connected,
- reaches the destination.

### Rule 9 — Keep planner and MPC separate

The planner outputs a trajectory.

The MPC consumes it.

Do not move controller logic into the planner.

### Rule 10 — Document implementation decisions

When implementation choices differ from this README because of the existing repository architecture, document the reason in the project README or implementation notes.

---

# 49. Definition of Done

The implementation is DONE only when all of the following work:

```text
[✓] Warehouse exists in a real coordinate system
[✓] Multiple routes exist
[✓] Vehicle exists
[✓] User can click any valid destination
[✓] A* dynamically calculates a route
[✓] Path avoids obstacles
[✓] Vehicle footprint is considered
[✓] Path is smoothed
[✓] Heading is generated
[✓] Desired speed is generated
[✓] Reference trajectory is produced
[✓] Planner interface is stable
[✓] Dynamic blockage can be created
[✓] Blocked route is detected
[✓] Replanning starts from current vehicle position
[✓] Original destination is retained
[✓] Alternate route is calculated
[✓] U-turn scenario can be handled
[✓] New trajectory is generated
[✓] MPC can consume the trajectory
[✓] Vehicle continues after replanning
[✓] Unreachable destinations are handled
[✓] At least 10 scenarios are tested
[✓] Existing project functionality is preserved
```

The final system must demonstrate:

```text
USER DESTINATION
       ↓
CURRENT VEHICLE STATE
       ↓
WAREHOUSE MAP
       ↓
      A*
       ↓
GLOBAL PATH
       ↓
PATH SMOOTHING
       ↓
REFERENCE TRAJECTORY
       ↓
      MPC
       ↓
    VEHICLE
       ↓
  BLOCKAGE
       ↓
  REPLANNING
       ↓
CURRENT POSITION + ORIGINAL GOAL
       ↓
      A*
       ↓
ALTERNATE PATH
       ↓
REFERENCE TRAJECTORY
       ↓
      MPC
       ↓
VEHICLE CONTINUES
```
