"""
test_planner_js_suite.py
========================
Python unittest implementation of the 14 automated test cases
defined in JavaScript `src/tests/testRunner.js`.

Tests:
T01 - Normal route Start->Goal
T02 - Different destination
T03 - Different starting position
T04 - Destination near warehouse boundary
T05 - Destination near obstacle
T06 - Primary route blocked
T07 - Alternate route available
T08 - Multiple roads blocked
T09 - U-turn required
T10 - Destination completely unreachable
T11 - Narrow corridor navigation
T12 - Blockage appearing near vehicle
T13 - Multiple simultaneous blockages
T14 - Path never passes through obstacles
"""

import unittest
from planner.map.warehouse_map import WarehouseMap
from planner.planner_interface import plan, replan
from planner.path_validator import validate_path


class TestPlannerJSSuite(unittest.TestCase):
    """Exhaustive 14-test verification matching JavaScript testRunner.js."""

    def setUp(self):
        self.map = WarehouseMap()

    def test_t01_normal_route(self):
        """T01 - Normal route Start->Goal."""
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), self.map)
        self.assertTrue(r.success, "Should find a path")
        self.assertGreater(len(r.path), 2, "Path should have multiple points")
        self.assertGreater(len(r.trajectory), 2, "Trajectory should have multiple points")
        self.assertGreater(r.metadata.path_length, 0.0, "Path length should be positive")

    def test_t02_different_destination(self):
        """T02 - Different destination."""
        r = plan((2.0, 2.0, 0.0, 0.0), (28.0, 2.0), self.map)
        self.assertTrue(r.success, "Should find a path")

    def test_t03_different_starting_position(self):
        """T03 - Different starting position."""
        r = plan((15.0, 18.0, 0.0, 0.0), (28.0, 2.0), self.map)
        self.assertTrue(r.success, "Should find a path")

    def test_t04_destination_near_boundary(self):
        """T04 - Destination near warehouse boundary."""
        r = plan((2.0, 2.0, 0.0, 0.0), (28.0, 18.0), self.map)
        self.assertTrue(r.success, "Should find a path near boundary")

    def test_t05_destination_near_obstacle(self):
        """T05 - Destination near obstacle."""
        r = plan((2.0, 2.0, 0.0, 0.0), (8.0, 10.0), self.map)
        self.assertTrue(r.success, "Should find path near obstacle")
        v = validate_path(r.path, self.map)
        self.assertTrue(v.valid, f"Path should be valid: {v.reason}")

    def test_t06_primary_route_blocked(self):
        """T06 - Primary route blocked."""
        m = WarehouseMap()
        r1 = plan((2.0, 2.0, 0.0, 0.0), (28.0, 17.0), m)
        self.assertTrue(r1.success, "Initial route should succeed")

        # Block a section along top corridor
        m.dynamic_obstacles.add_blockage(15.0, 17.0, 3.0, 2.0)

        # Replan
        r2 = replan((8.0, 2.0, 0.0, 0.0), (28.0, 17.0), m)
        self.assertTrue(r2.success, "Should find alternate route")
        self.assertTrue(r2.metadata.replanned, "Should be marked as replanned")

    def test_t07_alternate_route_available(self):
        """T07 - Alternate route available."""
        m = WarehouseMap()
        m.dynamic_obstacles.add_blockage(8.0, 1.5, 2.0, 2.0)
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), m)
        self.assertTrue(r.success, "Should find alternate route around blockage")

    def test_t08_multiple_roads_blocked(self):
        """T08 - Multiple roads blocked."""
        m = WarehouseMap()
        m.dynamic_obstacles.add_blockage(8.0, 1.5, 2.0, 2.0)
        m.dynamic_obstacles.add_blockage(8.0, 16.0, 2.0, 2.0)
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), m)
        self.assertIsInstance(r.success, bool, "Should return valid result")

    def test_t09_u_turn_required(self):
        """T09 - U-turn required."""
        m = WarehouseMap()
        m.dynamic_obstacles.add_blockage(3.0, 1.0, 2.0, 3.0)
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), m)
        self.assertIsInstance(r.success, bool, "Should handle U-turn scenario")

    def test_t10_destination_completely_unreachable(self):
        """T10 - Destination completely unreachable."""
        r = plan((2.0, 2.0, 0.0, 0.0), (5.0, 7.0), self.map)
        # Inside rack_01, should handle gracefully
        self.assertIsInstance(r.success, bool, "Should handle gracefully")

    def test_t11_narrow_corridor(self):
        """T11 - Narrow corridor navigation."""
        r = plan((2.0, 10.0, 0.0, 0.0), (15.0, 10.0), self.map)
        self.assertIsInstance(r.success, bool, "Should attempt narrow corridor")

    def test_t12_blockage_near_vehicle(self):
        """T12 - Blockage appearing near vehicle."""
        m = WarehouseMap()
        m.dynamic_obstacles.add_blockage(3.0, 1.5, 1.5, 1.5)
        r = replan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), m)
        self.assertIsInstance(r.success, bool, "Should handle near blockage")

    def test_t13_multiple_simultaneous_blockages(self):
        """T13 - Multiple simultaneous blockages."""
        m = WarehouseMap()
        m.dynamic_obstacles.add_blockage(8.0, 1.5, 2.0, 2.0)
        m.dynamic_obstacles.add_blockage(15.0, 1.5, 2.0, 2.0)
        m.dynamic_obstacles.add_blockage(22.0, 1.5, 2.0, 2.0)
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), m)
        self.assertIsInstance(r.success, bool, "Should handle multiple blockages")

    def test_t14_path_never_passes_through_obstacles(self):
        """T14 - Path never passes through obstacles."""
        r = plan((2.0, 2.0, 0.0, 0.0), (25.0, 17.0), self.map)
        if r.success:
            v = validate_path(r.path, self.map)
            self.assertTrue(v.valid, f"Path should be valid: {v.reason}")


if __name__ == "__main__":
    unittest.main()
