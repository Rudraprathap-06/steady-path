"""
dynamic_obstacles.py
====================
Manages temporary road blockages and dynamic obstacles that can be
added/removed at runtime to trigger dynamic replanning.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class DynamicBlockage:
    id: str
    x: float
    y: float
    width: float
    height: float
    type: str = "blockage"


class DynamicObstacles:
    """Dynamic obstacle manager for runtime road blockages."""

    def __init__(self):
        self._obstacles: Dict[str, DynamicBlockage] = {}
        self._next_id: int = 1

    def add_blockage(self, x: float, y: float, width: float = 1.5, height: float = 1.5) -> str:
        """Add a rectangular blockage."""
        blockage_id = f"blockage_{self._next_id}"
        self._next_id += 1
        obs = DynamicBlockage(id=blockage_id, x=float(x), y=float(y), width=float(width), height=float(height))
        self._obstacles[blockage_id] = obs
        return blockage_id

    def remove_blockage(self, blockage_id: str) -> bool:
        """Remove a blockage by ID."""
        if blockage_id in self._obstacles:
            del self._obstacles[blockage_id]
            return True
        return False

    def clear_all(self):
        """Remove all dynamic blockages."""
        self._obstacles.clear()

    def get_all(self) -> List[DynamicBlockage]:
        """Return all active dynamic blockages."""
        return list(self._obstacles.values())

    def is_blocked(self, px: float, py: float) -> bool:
        """Check if world point (px, py) is inside any dynamic blockage."""
        for obs in self._obstacles.values():
            if (obs.x <= px <= obs.x + obs.width) and (obs.y <= py <= obs.y + obs.height):
                return True
        return False

    def is_rect_blocked(self, x: float, y: float, w: float, h: float) -> bool:
        """Check if an AABB (x, y, w, h) overlaps any dynamic blockage."""
        for obs in self._obstacles.values():
            if (x < obs.x + obs.width and x + w > obs.x and
                    y < obs.y + obs.height and y + h > obs.y):
                return True
        return False

    @property
    def count(self) -> int:
        return len(self._obstacles)
