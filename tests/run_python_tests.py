"""
run_python_tests.py
===================
SteadyPath CLI Test Runner for Python.
Executes all 14 verification scenarios ported from the JS testRunner.
"""

import os
import sys

# Ensure repository root is on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import unittest
from tests.test_planner_js_suite import TestPlannerJSSuite

if __name__ == "__main__":
    print("Running SteadyPath Planner test suite via Python...\n")
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPlannerJSSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if result.wasSuccessful():
        print(f"\nAll {result.testsRun} test(s) passed successfully!")
        sys.exit(0)
    else:
        print(f"\n{len(result.failures) + len(result.errors)} test(s) failed.")
        sys.exit(1)
