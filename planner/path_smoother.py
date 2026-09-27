"""
path_smoother.py
================
Smooths raw A* paths using:
1. Greedy raycast shortcutting
2. Chaikin corner-cutting subdivision
3. Uniform resolution resampling with safety validation fallback
"""

import math
from typing import List, Tuple

from planner.map.warehouse_map import WarehouseMap
from planner.path_validator import is_segment_clear


def smooth_path(raw_path: List[Tuple[float, float]], map_state: WarehouseMap) -> List[Tuple[float, float]]:
    """Smooth a raw A* polyline path."""
    if len(raw_path) <= 2:
        return list(raw_path)

    # Pass 1: Greedy shortcutting
    shortened = shortcut_smooth(raw_path, map_state)

    # Pass 2: Chaikin subdivision (2 iterations)
    smoothed = shortened
    for _ in range(2):
        smoothed = chaikin_subdivide(smoothed)

    # Pass 3: Resample at grid resolution
    resampled = resample_path(smoothed, map_state.resolution)

    # Post-validation check
    for i in range(len(resampled) - 1):
        if not is_segment_clear(resampled[i], resampled[i + 1], map_state):
            # Fall back to resampled shortened path
            resampled_short = resample_path(shortened, map_state.resolution)
            for j in range(len(resampled_short) - 1):
                if not is_segment_clear(resampled_short[j], resampled_short[j + 1], map_state):
                    return list(raw_path)
            return resampled_short

    return resampled


def shortcut_smooth(path: List[Tuple[float, float]], map_state: WarehouseMap) -> List[Tuple[float, float]]:
    """Greedily skip intermediate waypoints if direct line is clear."""
    if len(path) <= 2:
        return list(path)

    result = [path[0]]
    current = 0

    while current < len(path) - 1:
        farthest = current + 1
        for ahead in range(len(path) - 1, current + 1, -1):
            if is_segment_clear(path[current], path[ahead], map_state):
                farthest = ahead
                break
        result.append(path[farthest])
        current = farthest

    return result


def chaikin_subdivide(path: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """One iteration of Chaikin's corner-cutting subdivision."""
    if len(path) <= 2:
        return list(path)

    result = [path[0]]
    for i in range(len(path) - 1):
        p0 = path[i]
        p1 = path[i + 1]
        # Q = 0.75 * P0 + 0.25 * P1
        qx = 0.75 * p0[0] + 0.25 * p1[0]
        qy = 0.75 * p0[1] + 0.25 * p1[1]
        result.append((qx, qy))

        # R = 0.25 * P0 + 0.75 * P1
        rx = 0.25 * p0[0] + 0.75 * p1[0]
        ry = 0.25 * p0[1] + 0.75 * p1[1]
        result.append((rx, ry))

    result.append(path[-1])
    return result


def resample_path(path: List[Tuple[float, float]], resolution: float) -> List[Tuple[float, float]]:
    """Resample polyline uniformly so waypoints are separated by ~resolution."""
    if len(path) <= 1:
        return list(path)

    result = [path[0]]
    for i in range(len(path) - 1):
        p0 = path[i]
        p1 = path[i + 1]
        dx = p1[0] - p0[0]
        dy = p1[1] - p0[1]
        dist = math.hypot(dx, dy)
        steps = max(1, int(math.ceil(dist / resolution)))
        for s in range(1, steps + 1):
            t = float(s) / float(steps)
            result.append((p0[0] + dx * t, p0[1] + dy * t))
    return result
