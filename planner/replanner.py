"""
replanner.py
============
Handles dynamic path replanning when unexpected blockages occur:
- Uses current vehicle position as new start
- Retains original destination as goal
- Finds collision-free alternate routes via A*
- Detects and accommodates U-turns
"""

import math
import time
from typing import Tuple, List, Optional
from dataclasses import dataclass

from planner.config import SPEED_CONFIG
from planner.map.warehouse_map import WarehouseMap
from planner.astar_planner import astar_plan
from planner.path_smoother import smooth_path
from planner.path_validator import validate_path, check_path_blocked
from planner.trajectory_generator import generate_trajectory, path_length, TrajectoryPoint, normalize_angle


@dataclass
class PlannerMetadata:
    path_length: float
    planning_time_ms: float
    replanned: bool
    nodes_explored: int
    u_turn_required: bool = False


@dataclass
class PlannerResult:
    success: bool
    status: str
    path: List[Tuple[float, float]]
    raw_path: List[Tuple[float, float]]
    trajectory: List[TrajectoryPoint]
    metadata: PlannerMetadata
    reason: str = ""


def dynamic_replan(current_state: Tuple[float, float, float, float], destination: Tuple[float, float], map_state: WarehouseMap) -> PlannerResult:
    """
    Replan route dynamically from current vehicle state (x, y, heading, v) to destination.
    """
    t0 = time.perf_counter()
    curr_x, curr_y, curr_heading, curr_v = current_state
    dest_x, dest_y = destination

    # Destination checks
    if not map_state.is_inside_bounds(dest_x, dest_y):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="INVALID_DESTINATION", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, True, 0), reason="Destination outside warehouse."
        )

    if map_state.is_inside_obstacle(dest_x, dest_y):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="INVALID_DESTINATION", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, True, 0), reason="Destination is blocked by an obstacle."
        )

    # Snap start if needed
    start_pt = (curr_x, curr_y)
    if not map_state.is_valid_position(curr_x, curr_y):
        snapped = map_state.snap_to_free_cell(curr_x, curr_y)
        if snapped:
            start_pt = snapped
        else:
            t_ms = (time.perf_counter() - t0) * 1000.0
            return PlannerResult(
                success=False, status="INVALID_START", path=[], raw_path=[], trajectory=[],
                metadata=PlannerMetadata(0.0, t_ms, True, 0), reason="Vehicle position is blocked."
            )

    goal_pt = (dest_x, dest_y)
    if not map_state.is_valid_position(dest_x, dest_y):
        snapped_g = map_state.snap_to_free_cell(dest_x, dest_y)
        if snapped_g:
            goal_pt = snapped_g
        else:
            t_ms = (time.perf_counter() - t0) * 1000.0
            return PlannerResult(
                success=False, status="NO_PATH", path=[], raw_path=[], trajectory=[],
                metadata=PlannerMetadata(0.0, t_ms, True, 0), reason="Destination is unreachable."
            )

    # Search alternate route via A*
    astar_res = astar_plan(start_pt, goal_pt, map_state)
    if not astar_res.success or len(astar_res.path) < 2:
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="NO_PATH", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, True, astar_res.nodes_explored), reason="No alternate route available."
        )

    # Smooth path
    smoothed = smooth_path(astar_res.path, map_state)
    val = validate_path(smoothed, map_state)
    final_path = smoothed if val.valid else astar_res.path

    # Check for U-turn requirement
    u_turn_required = False
    if len(final_path) >= 2:
        initial_heading = math.atan2(final_path[1][1] - final_path[0][1], final_path[1][0] - final_path[0][0])
        h_diff = abs(normalize_angle(initial_heading - curr_heading))
        if h_diff >= SPEED_CONFIG.u_turn_threshold:
            u_turn_required = True

    # Generate trajectory
    trajectory = generate_trajectory(final_path)
    if u_turn_required and trajectory:
        trajectory[0].desired_speed = SPEED_CONFIG.u_turn
        if len(trajectory) > 1:
            trajectory[1].desired_speed = min(trajectory[1].desired_speed, SPEED_CONFIG.u_turn)

    total_len = path_length(final_path)
    t_ms = (time.perf_counter() - t0) * 1000.0

    return PlannerResult(
        success=True,
        status="REPLANNED",
        path=final_path,
        raw_path=astar_res.path,
        trajectory=trajectory,
        metadata=PlannerMetadata(
            path_length=total_len,
            planning_time_ms=t_ms,
            replanned=True,
            nodes_explored=astar_res.nodes_explored,
            u_turn_required=u_turn_required,
        )
    )


def is_path_blocked(path: List[Tuple[float, float]], map_state: WarehouseMap, current_index: int = 0) -> Tuple[bool, int]:
    """Check if the active path is blocked at or ahead of current waypoint index."""
    return check_path_blocked(path, map_state, current_index)
