"""
planner_interface.py
====================
Stable functional interface for path planning, dynamic replanning,
and route obstruction monitoring.
"""

import time
from typing import Tuple, List, Dict, Any, Optional

from planner.map.warehouse_map import WarehouseMap
from planner.astar_planner import astar_plan
from planner.path_smoother import smooth_path
from planner.path_validator import validate_path
from planner.trajectory_generator import generate_trajectory, path_length
from planner.replanner import dynamic_replan, is_path_blocked, PlannerResult, PlannerMetadata


def plan(current_state: Tuple[float, float, float, float], destination: Tuple[float, float], map_state: WarehouseMap) -> PlannerResult:
    """Plan a route from vehicle current_state (x, y, heading, v) to destination (x, y)."""
    t0 = time.perf_counter()
    curr_x, curr_y, curr_heading, curr_v = current_state
    dest_x, dest_y = destination

    # Destination bounds and obstacles
    if not map_state.is_inside_bounds(dest_x, dest_y):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="INVALID_DESTINATION", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, False, 0), reason="Destination outside warehouse."
        )

    if map_state.is_inside_obstacle(dest_x, dest_y):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="INVALID_DESTINATION", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, False, 0), reason="Destination is blocked."
        )

    # Start point check and snap
    start_pt = (curr_x, curr_y)
    if not map_state.is_valid_position(curr_x, curr_y):
        snapped = map_state.snap_to_free_cell(curr_x, curr_y)
        if snapped:
            start_pt = snapped
        else:
            t_ms = (time.perf_counter() - t0) * 1000.0
            return PlannerResult(
                success=False, status="INVALID_START", path=[], raw_path=[], trajectory=[],
                metadata=PlannerMetadata(0.0, t_ms, False, 0), reason="Current vehicle position is invalid."
            )

    # Goal snap if necessary
    goal_pt = (dest_x, dest_y)
    if not map_state.is_valid_position(dest_x, dest_y):
        snapped_g = map_state.snap_to_free_cell(dest_x, dest_y)
        if snapped_g:
            goal_pt = snapped_g
        else:
            t_ms = (time.perf_counter() - t0) * 1000.0
            return PlannerResult(
                success=False, status="NO_PATH", path=[], raw_path=[], trajectory=[],
                metadata=PlannerMetadata(0.0, t_ms, False, 0), reason="No valid route exists."
            )

    # Run A*
    astar_res = astar_plan(start_pt, goal_pt, map_state)
    if not astar_res.success:
        t_ms = (time.perf_counter() - t0) * 1000.0
        return PlannerResult(
            success=False, status="NO_PATH", path=[], raw_path=[], trajectory=[],
            metadata=PlannerMetadata(0.0, t_ms, False, astar_res.nodes_explored), reason="No valid route exists."
        )

    # Smooth path
    smoothed = smooth_path(astar_res.path, map_state)
    val = validate_path(smoothed, map_state)
    final_path = smoothed if val.valid else astar_res.path

    # Trajectory
    trajectory = generate_trajectory(final_path)
    tot_len = path_length(final_path)
    t_ms = (time.perf_counter() - t0) * 1000.0

    return PlannerResult(
        success=True,
        status="PATH_FOUND",
        path=final_path,
        raw_path=astar_res.path,
        trajectory=trajectory,
        metadata=PlannerMetadata(
            path_length=tot_len,
            planning_time_ms=t_ms,
            replanned=False,
            nodes_explored=astar_res.nodes_explored,
        )
    )


def replan(current_state: Tuple[float, float, float, float], destination: Tuple[float, float], updated_map_state: WarehouseMap) -> PlannerResult:
    """Replan route dynamically from current position to original destination with updated map."""
    return dynamic_replan(current_state, destination, updated_map_state)


def is_current_path_blocked(path: List[Tuple[float, float]], map_state: WarehouseMap, current_index: int = 0) -> Tuple[bool, int]:
    """Check if the path has a dynamic blockage ahead."""
    return is_path_blocked(path, map_state, current_index)
