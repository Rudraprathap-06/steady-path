"""
path_validator.py
=================
Validates path safety against static obstacles, dynamic blockages,
vehicle safety inflation margins, boundary envelopes, and connectivity gaps.
"""

import math
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass

from planner.config import WAREHOUSE, VEHICLE_CONFIG
from planner.map.warehouse_map import WarehouseMap


@dataclass
class ValidationResult:
    valid: bool
    reason: str


def validate_path(path: List[Tuple[float, float]], map_state: WarehouseMap) -> ValidationResult:
    """Validate a path against the warehouse map."""
    if not path or len(path) == 0:
        return ValidationResult(valid=False, reason="EMPTY_PATH")

    inflate = VEHICLE_CONFIG.inflation

    for i, (px, py) in enumerate(path):
        # Boundary check
        if (px - inflate < 0.0 or px + inflate > WAREHOUSE.width or
                py - inflate < 0.0 or py + inflate > WAREHOUSE.height):
            return ValidationResult(valid=False, reason=f"OUT_OF_BOUNDS at index {i} ({px:.2f}, {py:.2f})")

        # Static obstacles
        for obs in map_state.blocking_obstacles:
            if (px + inflate > obs.x and px - inflate < obs.x + obs.width and
                    py + inflate > obs.y and py - inflate < obs.y + obs.height):
                return ValidationResult(valid=False, reason=f"STATIC_COLLISION with {obs.id} at index {i}")

        # Dynamic obstacles
        if map_state.dynamic_obstacles.is_rect_blocked(
            px - inflate, py - inflate, inflate * 2.0, inflate * 2.0
        ):
            return ValidationResult(valid=False, reason=f"DYNAMIC_COLLISION at index {i}")

    # Connectivity check
    max_gap = map_state.resolution * 2.5
    for i in range(1, len(path)):
        dx = path[i][0] - path[i - 1][0]
        dy = path[i][1] - path[i - 1][1]
        dist = math.hypot(dx, dy)
        if dist > max_gap:
            return ValidationResult(valid=False, reason=f"DISCONNECTED at index {i}, gap={dist:.2f}m")

    return ValidationResult(valid=True, reason="OK")


def is_segment_clear(a: Tuple[float, float], b: Tuple[float, float], map_state: WarehouseMap, step_size: float = 0.25) -> bool:
    """Check if the straight line segment between points a and b is collision-free."""
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    dist = math.hypot(dx, dy)
    steps = max(1, int(math.ceil(dist / step_size)))

    inflate = VEHICLE_CONFIG.inflation

    for s in range(steps + 1):
        t = float(s) / float(steps)
        px = a[0] + dx * t
        py = a[1] + dy * t

        if (px - inflate < 0.0 or px + inflate > WAREHOUSE.width or
                py - inflate < 0.0 or py + inflate > WAREHOUSE.height):
            return False

        for obs in map_state.blocking_obstacles:
            if (px + inflate > obs.x and px - inflate < obs.x + obs.width and
                    py + inflate > obs.y and py - inflate < obs.y + obs.height):
                return False

        if map_state.dynamic_obstacles.is_rect_blocked(
            px - inflate, py - inflate, inflate * 2.0, inflate * 2.0
        ):
            return False

    return True


def check_path_blocked(path: List[Tuple[float, float]], map_state: WarehouseMap, start_index: int = 0) -> Tuple[bool, int]:
    """Check if any point on path from start_index onward is blocked by dynamic obstacles."""
    inflate = VEHICLE_CONFIG.inflation
    for i in range(start_index, len(path)):
        px, py = path[i]
        if map_state.dynamic_obstacles.is_rect_blocked(
            px - inflate, py - inflate, inflate * 2.0, inflate * 2.0
        ):
            return True, i
    return False, -1
