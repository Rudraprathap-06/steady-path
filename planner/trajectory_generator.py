"""
trajectory_generator.py
=======================
Produces [x, y, yaw, desiredSpeed, curvature, s] reference trajectory
from smoothed path waypoints.
"""

import math
from typing import List, Tuple
from dataclasses import dataclass

from planner.config import SPEED_CONFIG


@dataclass
class TrajectoryPoint:
    x: float
    y: float
    heading: float
    desired_speed: float
    curvature: float = 0.0
    s: float = 0.0


def normalize_angle(angle: float) -> float:
    """Normalize angle to [-pi, pi]."""
    while angle > math.pi:
        angle -= 2.0 * math.pi
    while angle < -math.pi:
        angle += 2.0 * math.pi
    return angle


def path_length(path: List[Tuple[float, float]]) -> float:
    """Compute total cumulative path length in meters."""
    length = 0.0
    for i in range(1, len(path)):
        length += math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
    return length


def generate_trajectory(path: List[Tuple[float, float]]) -> List[TrajectoryPoint]:
    """Generate reference trajectory with tangent headings and curvature-dependent speeds."""
    if not path:
        return []
    if len(path) == 1:
        return [TrajectoryPoint(x=path[0][0], y=path[0][1], heading=0.0, desired_speed=0.0)]

    # Compute headings
    headings: List[float] = []
    for i in range(len(path)):
        if i < len(path) - 1:
            dx = path[i + 1][0] - path[i][0]
            dy = path[i + 1][1] - path[i][1]
            headings.append(math.atan2(dy, dx))
        else:
            headings.append(headings[-1])

    # Compute cumulative arc lengths s
    s_accum = 0.0
    s_list = [0.0]
    for i in range(1, len(path)):
        s_accum += math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
        s_list.append(s_accum)

    trajectory: List[TrajectoryPoint] = []
    for i in range(len(path)):
        if i == 0 or i == len(path) - 1:
            speed = SPEED_CONFIG.sharp_turn
            curv = 0.0
        else:
            d_heading = abs(normalize_angle(headings[i] - headings[i - 1]))
            ds = max(0.001, s_list[i] - s_list[i - 1])
            curv = d_heading / ds

            if d_heading >= SPEED_CONFIG.u_turn_threshold:
                speed = SPEED_CONFIG.u_turn
            elif d_heading >= SPEED_CONFIG.sharp_turn_threshold:
                speed = SPEED_CONFIG.sharp_turn
            elif d_heading >= SPEED_CONFIG.moderate_turn_threshold:
                speed = SPEED_CONFIG.moderate_turn
            else:
                speed = SPEED_CONFIG.straight

        trajectory.append(TrajectoryPoint(
            x=round(path[i][0], 4),
            y=round(path[i][1], 4),
            heading=round(headings[i], 4),
            desired_speed=round(speed, 4),
            curvature=round(curv, 4),
            s=round(s_list[i], 4),
        ))

    # Stop at goal
    trajectory[-1].desired_speed = 0.0
    return trajectory
