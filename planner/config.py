"""
config.py
=========
SteadyPath Central Configuration (Python Port)
All configurable parameters for warehouse geometry, vehicle kinematics,
grid resolution, curvature speed thresholds, and simulation parameters.
Units: meters, m/s, radians.
"""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class WarehouseDimensions:
    width: float = 30.0   # meters
    height: float = 20.0  # meters


@dataclass(frozen=True)
class PlannerSettings:
    grid_resolution: float = 0.5  # meters per grid cell
    allow_diagonal: bool = True   # 8-directional movement


@dataclass(frozen=True)
class VehicleDimensions:
    width: float = 1.2         # meters
    length: float = 2.0        # meters
    safety_margin: float = 0.3 # meters - inflated around obstacles

    @property
    def inflation(self) -> float:
        """Effective inflation radius around obstacles: half width + safety margin."""
        return (self.width / 2.0) + self.safety_margin


@dataclass(frozen=True)
class SpeedProfile:
    straight: float = 1.5       # m/s
    moderate_turn: float = 1.0  # m/s
    sharp_turn: float = 0.6     # m/s
    u_turn: float = 0.4         # m/s

    # Curvature thresholds (radians between consecutive headings)
    moderate_turn_threshold: float = math.pi / 6.0   # 30 deg
    sharp_turn_threshold: float = math.pi / 3.0      # 60 deg
    u_turn_threshold: float = (2.0 * math.pi) / 3.0  # 120 deg


@dataclass(frozen=True)
class SimulationSettings:
    fps: int = 60
    vehicle_start_x: float = 2.0
    vehicle_start_y: float = 2.0
    vehicle_start_heading: float = 0.0
    follow_speed: float = 1.2            # m/s
    waypoint_reach_threshold: float = 0.3 # meters


# Default singletons
WAREHOUSE = WarehouseDimensions()
PLANNER_CONFIG = PlannerSettings()
VEHICLE_CONFIG = VehicleDimensions()
SPEED_CONFIG = SpeedProfile()
SIMULATION_CONFIG = SimulationSettings()
