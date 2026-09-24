// ============================================================
// SteadyPath — Central Configuration
// ============================================================
// All configurable parameters in one place.
// Units: meters, m/s, radians.
// ============================================================

export const WAREHOUSE = {
    width: 30,   // meters
    height: 20,  // meters
};

export const PLANNER_CONFIG = {
    gridResolution: 0.5,  // meters per grid cell
    allowDiagonal: true,   // 8-directional movement
};

export const VEHICLE_CONFIG = {
    width: 1.2,        // meters
    length: 2.0,       // meters
    safetyMargin: 0.3, // meters — inflated around obstacles
};

export const SPEED_CONFIG = {
    straight: 1.5,      // m/s
    moderateTurn: 1.0,   // m/s
    sharpTurn: 0.6,      // m/s
    uTurn: 0.4,          // m/s
    // Curvature thresholds (radians between consecutive headings)
    moderateTurnThreshold: Math.PI / 6,   // 30°
    sharpTurnThreshold: Math.PI / 3,      // 60°
    uTurnThreshold: (2 * Math.PI) / 3,    // 120°
};

export const SIMULATION_CONFIG = {
    fps: 60,
    vehicleStartX: 2,
    vehicleStartY: 2,
    vehicleStartHeading: 0,
    followSpeed: 1.2,         // m/s — trajectory follower default speed
    waypointReachThreshold: 0.3, // m — how close to count as "reached"
};

export const COLORS = {
    background: '#0f1117',
    warehouseBg: '#1a1d27',
    warehouseBorder: '#3a3f55',
    road: '#2a2f3f',
    roadLine: '#3a4055',
    rack: '#4a3520',
    wall: '#555a6e',
    pillar: '#6a6f82',
    loadingZone: 'rgba(46, 204, 113, 0.15)',
    loadingZoneBorder: '#2ecc71',
    restrictedZone: 'rgba(231, 76, 60, 0.15)',
    restrictedZoneBorder: '#e74c3c',
    rawPath: '#00bcd4',
    smoothedPath: '#2ecc71',
    replannedPath: '#ff9800',
    trajectory: '#e91e63',
    vehicle: '#00e5ff',
    vehicleHeading: '#ff4081',
    goal: '#ffd740',
    blockage: '#ff5252',
    gridLine: 'rgba(255,255,255,0.04)',
    text: '#e0e0e0',
    textMuted: '#888',
};
