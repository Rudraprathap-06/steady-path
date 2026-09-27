"""
static_obstacles.py
===================
Defines all permanent warehouse obstacles: racks, walls,
pillars, loading zones, and restricted zones.
"""

from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass(frozen=True)
class ObstacleRect:
    id: str
    type: str
    x: float
    y: float
    width: float
    height: float
    label: str = ""


def create_static_obstacles() -> List[ObstacleRect]:
    """
    Create the default set of static obstacles for the warehouse.
    (x, y) is the bottom-left corner of the obstacle rectangle.
    """
    return [
        # Storage Racks
        # Left block (two racks)
        ObstacleRect(id="rack_01", type="rack", x=4.0, y=5.0, width=3.0, height=4.0),
        ObstacleRect(id="rack_02", type="rack", x=4.0, y=11.0, width=3.0, height=4.0),

        # Center block (two racks)
        ObstacleRect(id="rack_03", type="rack", x=11.0, y=5.0, width=3.0, height=4.0),
        ObstacleRect(id="rack_04", type="rack", x=11.0, y=11.0, width=3.0, height=4.0),

        # Right block (two racks)
        ObstacleRect(id="rack_05", type="rack", x=18.0, y=5.0, width=3.0, height=4.0),
        ObstacleRect(id="rack_06", type="rack", x=18.0, y=11.0, width=3.0, height=4.0),

        # Interior dividing wall
        ObstacleRect(id="wall_01", type="wall", x=25.0, y=8.0, width=0.5, height=4.0),

        # Structural Pillars
        ObstacleRect(id="pillar_01", type="pillar", x=9.0, y=9.7, width=0.6, height=0.6),
        ObstacleRect(id="pillar_02", type="pillar", x=16.0, y=9.7, width=0.6, height=0.6),
    ]


def create_loading_zones() -> List[ObstacleRect]:
    """Create loading zone descriptors (non-blocking, designated operational areas)."""
    return [
        ObstacleRect(id="loading_01", type="loading", x=26.0, y=1.0, width=3.0, height=3.0, label="Load A"),
        ObstacleRect(id="loading_02", type="loading", x=26.0, y=16.0, width=3.0, height=3.0, label="Load B"),
    ]


def create_restricted_zones() -> List[ObstacleRect]:
    """Create restricted zone descriptors (blocking zones)."""
    return [
        ObstacleRect(id="restricted_01", type="restricted", x=15.0, y=6.5, width=2.0, height=2.5),
    ]
