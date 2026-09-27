"""
warehouse_map.py
================
Authoritative map representation: dimensions, obstacles,
occupancy grid, inflation margins, and spatial queries.
"""

import math
from typing import List, Tuple, Optional
try:
    import numpy as np
except ImportError:
    np = None

from planner.config import WAREHOUSE, PLANNER_CONFIG, VEHICLE_CONFIG
from planner.map.static_obstacles import (
    create_static_obstacles, create_restricted_zones, create_loading_zones, ObstacleRect
)
from planner.map.dynamic_obstacles import DynamicObstacles


class WarehouseMap:
    """Single source of truth for the warehouse spatial environment."""

    def __init__(self, width: float = WAREHOUSE.width, height: float = WAREHOUSE.height, resolution: float = PLANNER_CONFIG.grid_resolution):
        self.width = float(width)
        self.height = float(height)
        self.resolution = float(resolution)

        self.static_obstacles: List[ObstacleRect] = create_static_obstacles()
        self.restricted_zones: List[ObstacleRect] = create_restricted_zones()
        self.loading_zones: List[ObstacleRect] = create_loading_zones()
        self.dynamic_obstacles = DynamicObstacles()

        # All blocking obstacles
        self.blocking_obstacles: List[ObstacleRect] = self.static_obstacles + self.restricted_zones

        self.grid_cols = int(math.ceil(self.width / self.resolution))
        self.grid_rows = int(math.ceil(self.height / self.resolution))

        # Build occupancy grid: True = free, False = blocked
        self.grid: List[List[bool]] = self._build_grid()

    def _build_grid(self) -> List[List[bool]]:
        """
        Build the base occupancy grid from static obstacles inflated by vehicle safety margin.
        """
        inflate = VEHICLE_CONFIG.inflation
        grid = [[False for _ in range(self.grid_cols)] for _ in range(self.grid_rows)]
        for r in range(self.grid_rows):
            wy = r * self.resolution
            for c in range(self.grid_cols):
                wx = c * self.resolution
                grid[r][c] = not self._is_static_blocked(wx, wy, inflate)
        return grid

    def _is_static_blocked(self, wx: float, wy: float, inflate: float) -> bool:
        """Check if a world coordinate (with vehicle inflation) collides with boundaries or static obstacles."""
        if (wx - inflate < 0.0 or wx + inflate > self.width or
                wy - inflate < 0.0 or wy + inflate > self.height):
            return True

        for obs in self.blocking_obstacles:
            if (wx + inflate > obs.x and wx - inflate < obs.x + obs.width and
                    wy + inflate > obs.y and wy - inflate < obs.y + obs.height):
                return True
        return False

    def world_to_grid(self, wx: float, wy: float) -> Tuple[int, int]:
        """Convert world coordinates (meters) to grid cell (col, row)."""
        return int(round(wx / self.resolution)), int(round(wy / self.resolution))

    def grid_to_world(self, col: int, row: int) -> Tuple[float, float]:
        """Convert grid cell (col, row) to world coordinates (meters)."""
        return float(col * self.resolution), float(row * self.resolution)

    def is_cell_free(self, col: int, row: int) -> bool:
        """Check if grid cell (col, row) is free of static and dynamic obstacles."""
        if col < 0 or col >= self.grid_cols or row < 0 or row >= self.grid_rows:
            return False

        if not self.grid[row][col]:
            return False

        # Dynamic obstacles check
        x, y = self.grid_to_world(col, row)
        inflate = VEHICLE_CONFIG.inflation
        return not self.dynamic_obstacles.is_rect_blocked(
            x - inflate, y - inflate, inflate * 2.0, inflate * 2.0
        )

    def is_valid_position(self, wx: float, wy: float) -> bool:
        """Is a world point inside the warehouse bounds and collision-free?"""
        if wx < 0.0 or wx > self.width or wy < 0.0 or wy > self.height:
            return False
        col, row = self.world_to_grid(wx, wy)
        return self.is_cell_free(col, row)

    def is_inside_bounds(self, wx: float, wy: float) -> bool:
        """Check if world point is within warehouse outer boundary."""
        return (0.0 <= wx <= self.width) and (0.0 <= wy <= self.height)

    def is_inside_obstacle(self, wx: float, wy: float) -> bool:
        """Check if a world point is inside any static or dynamic obstacle (uninflated)."""
        for obs in self.blocking_obstacles:
            if (obs.x <= wx <= obs.x + obs.width) and (obs.y <= wy <= obs.y + obs.height):
                return True
        return self.dynamic_obstacles.is_blocked(wx, wy)

    def snap_to_free_cell(self, wx: float, wy: float) -> Optional[Tuple[float, float]]:
        """Snap a world point to the nearest free grid cell via expanding ring search."""
        col, row = self.world_to_grid(wx, wy)
        if self.is_cell_free(col, row):
            return self.grid_to_world(col, row)

        for radius in range(1, 20):
            for dr in range(-radius, radius + 1):
                for dc in range(-radius, radius + 1):
                    if abs(dr) != radius and abs(dc) != radius:
                        continue
                    nc = col + dc
                    nr = row + dr
                    if self.is_cell_free(nc, nr):
                        return self.grid_to_world(nc, nr)
        return None
