"""
astar_planner.py
================
8-directional grid A* path planner with octile heuristic and
diagonal corner-cutting prevention.
"""

import math
import time
import heapq
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

from planner.config import PLANNER_CONFIG
from planner.map.warehouse_map import WarehouseMap


@dataclass
class AStarResult:
    success: bool
    path: List[Tuple[float, float]]
    nodes_explored: int
    planning_time_ms: float


def octile_heuristic(c1: int, r1: int, c2: int, r2: int) -> float:
    """Octile distance heuristic for 8-directional grids."""
    dx = abs(c1 - c2)
    dy = abs(r1 - r2)
    return max(dx, dy) + (math.sqrt(2.0) - 1.0) * min(dx, dy)


def astar_plan(start: Tuple[float, float], goal: Tuple[float, float], map_state: WarehouseMap) -> AStarResult:
    """Plan an 8-connected grid A* path between start and goal world coordinates."""
    t0 = time.perf_counter()

    start_cell = map_state.world_to_grid(start[0], start[1])
    goal_cell = map_state.world_to_grid(goal[0], goal[1])

    if not map_state.is_cell_free(start_cell[0], start_cell[1]):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return AStarResult(success=False, path=[], nodes_explored=0, planning_time_ms=t_ms)

    if not map_state.is_cell_free(goal_cell[0], goal_cell[1]):
        t_ms = (time.perf_counter() - t0) * 1000.0
        return AStarResult(success=False, path=[], nodes_explored=0, planning_time_ms=t_ms)

    # Orthogonal and diagonal directions
    d_sqrt2 = math.sqrt(2.0)
    dirs = [
        (1, 0, 1.0),
        (-1, 0, 1.0),
        (0, 1, 1.0),
        (0, -1, 1.0),
    ]
    if PLANNER_CONFIG.allow_diagonal:
        dirs.extend([
            (1, 1, d_sqrt2),
            (-1, 1, d_sqrt2),
            (1, -1, d_sqrt2),
            (-1, -1, d_sqrt2),
        ])

    cols = map_state.grid_cols
    def cell_key(c: int, r: int) -> int:
        return r * cols + c

    start_k = cell_key(start_cell[0], start_cell[1])
    goal_k = cell_key(goal_cell[0], goal_cell[1])

    g_score: Dict[int, float] = {start_k: 0.0}
    h_start = octile_heuristic(start_cell[0], start_cell[1], goal_cell[0], goal_cell[1])
    came_from: Dict[int, int] = {}
    closed_set = set()

    # Heap contains: (f_score, counter, col, row, key)
    counter = 0
    open_heap = [(h_start, counter, start_cell[0], start_cell[1], start_k)]
    nodes_explored = 0

    while open_heap:
        f, _, col, row, ck = heapq.heappop(open_heap)

        if ck == goal_k:
            # Reconstruct path
            path: List[Tuple[float, float]] = []
            curr = ck
            while curr in came_from:
                r_c = curr // cols
                c_c = curr % cols
                path.append(map_state.grid_to_world(c_c, r_c))
                curr = came_from[curr]
            # Add start
            r_s = curr // cols
            c_s = curr % cols
            path.append(map_state.grid_to_world(c_s, r_s))
            path.reverse()

            t_ms = (time.perf_counter() - t0) * 1000.0
            return AStarResult(success=True, path=path, nodes_explored=nodes_explored, planning_time_ms=t_ms)

        if ck in closed_set:
            continue
        closed_set.add(ck)
        nodes_explored += 1

        for dc, dr, cost in dirs:
            nc = col + dc
            nr = row + dr
            nk = cell_key(nc, nr)

            if nk in closed_set:
                continue
            if not map_state.is_cell_free(nc, nr):
                continue

            # Corner cutting check for diagonal moves
            if dc != 0 and dr != 0:
                if (not map_state.is_cell_free(col + dc, row) or
                        not map_state.is_cell_free(col, row + dr)):
                    continue

            tentative_g = g_score[ck] + cost
            if tentative_g < g_score.get(nk, float("inf")):
                came_from[nk] = ck
                g_score[nk] = tentative_g
                f_val = tentative_g + octile_heuristic(nc, nr, goal_cell[0], goal_cell[1])
                counter += 1
                heapq.heappush(open_heap, (f_val, counter, nc, nr, nk))

    t_ms = (time.perf_counter() - t0) * 1000.0
    return AStarResult(success=False, path=[], nodes_explored=nodes_explored, planning_time_ms=t_ms)
