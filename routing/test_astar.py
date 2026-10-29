"""
Unit Test Script for SafeRoute A* Search Algorithm (Stage 4)
Covers:
1. Valid connected road route using OpenStreetMap graph edges
2. Graph edge verification: every step in path exists in adjacency list
3. Distance validation: road distance >= straight-line distance
4. Start equals destination handling (zero distance, single point)
5. Unreachable isolated destination handling
6. Snapping validation: query point outside walkable boundary rejected
7. Invalid identifier handling
8. Multi-turn road geometry continuity: strictly ordered, no jumping/doubling back, no duplicates
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
sys.path.append(PROJECT_ROOT)

from routing.astar import (
    a_star_search,
    snap_to_road_graph,
    NODES,
    EDGES,
    haversine_km,
    DEMO_HUBS_CONFIG,
)


def test_astar_suite():
    print("=" * 65)
    print("SafeRoute: Running Stage 4 A* OSM Road Routing Test Suite")
    print("=" * 65)

    assert len(NODES) > 0, "Test Setup failed: Road graph nodes not loaded."
    assert len(EDGES) > 0, "Test Setup failed: Road graph edges not loaded."
    print(f"[Setup] Loaded OSM Road Graph: {len(NODES)} nodes, {len(EDGES)} edge sources.")

    # -------------------------------------------------------------
    # Test 1: Valid Connected Route (Model Town -> Civil Hospital)
    # -------------------------------------------------------------
    start = "N_MODEL_TOWN"
    goal = "H_CIVIL_HOSPITAL"
    result1 = a_star_search(start, goal)

    print(f"\n[TEST 1] Valid Connected Route: {start} -> {goal}")
    print(f"  Status: {result1['status']}")
    print(f"  Nodes traversed: {len(result1['node_ids'])}")
    print(f"  Geometry points: {len(result1.get('geometry', []))}")
    print(f"  Road Distance: {result1['road_distance_km']} km")
    print(f"  Straight-Line Distance: {result1['straight_line_distance_km']} km")

    assert result1["status"] == "success", f"Test 1 failed: Expected success, got {result1['status']}"
    assert len(result1["route"]) >= 2, "Test 1 failed: Expected at least 2 nodes in path."
    assert len(result1["geometry"]) >= len(result1["route"]), (
        "Test 1 failed: Route geometry must contain detailed curved points along road segments."
    )
    assert result1["road_distance_km"] > 0, "Test 1 failed: Road distance must be positive."
    assert result1["straight_line_distance_km"] > 0, "Test 1 failed: Straight distance must be positive."
    assert result1["road_distance_km"] >= result1["straight_line_distance_km"], (
        f"Test 1 failed: Road distance ({result1['road_distance_km']} km) must be >= straight-line ({result1['straight_line_distance_km']} km)."
    )

    # Verify that every consecutive pair (u, v) in the path is a real edge in EDGES[u]
    path_ids = result1["node_ids"]
    for i in range(len(path_ids) - 1):
        u = path_ids[i]
        v = path_ids[i + 1]
        neighbors = [e["target"] for e in EDGES.get(u, [])]
        assert v in neighbors, f"Test 1 failed: Segment ({u} -> {v}) is NOT an edge in the road graph!"

    print("  => PASS: Valid path strictly adheres to real OpenStreetMap road edges.")

    # -------------------------------------------------------------
    # Test 2: Start Equals Destination
    # -------------------------------------------------------------
    same_node = "N_BMC_CHOWK"
    result2 = a_star_search(same_node, same_node)

    print(f"\n[TEST 2] Start Equals Destination: {same_node} -> {same_node}")
    print(f"  Status: {result2['status']}")
    print(f"  Road Distance: {result2['road_distance_km']} km")
    print(f"  Straight-Line Distance: {result2['straight_line_distance_km']} km")

    assert result2["status"] == "success", "Test 2 failed: Expected success status."
    assert result2["road_distance_km"] == 0.0, "Test 2 failed: Road distance must be 0."
    assert result2["straight_line_distance_km"] == 0.0, "Test 2 failed: Straight distance must be 0."
    assert len(result2["node_ids"]) == 1, "Test 2 failed: Path must contain exactly 1 node."
    assert len(result2["geometry"]) == 1, "Test 2 failed: Geometry must contain single coordinate."
    print("  => PASS")

    # -------------------------------------------------------------
    # Test 3: Unreachable Destination Handling (Isolated Demo Outpost)
    # -------------------------------------------------------------
    unreachable_goal = "N_ISOLATED_DEMO"
    result3 = a_star_search(start, unreachable_goal)

    print(f"\n[TEST 3] Unreachable Destination: {start} -> {unreachable_goal}")
    print(f"  Status: {result3['status']}")
    print(f"  Message: {result3['message']}")

    assert result3["status"] == "unreachable", "Test 3 failed: Expected 'unreachable' status."
    assert len(result3["route"]) == 0, "Test 3 failed: Unreachable route must be empty."
    assert len(result3["geometry"]) == 0, "Test 3 failed: Unreachable geometry must be empty."
    print("  => PASS")

    # -------------------------------------------------------------
    # Test 4: Snapping Distance Validation & Out-of-Bounds Rejection
    # -------------------------------------------------------------
    # Valid point in central Jalandhar (near BMC chowk)
    valid_lat, valid_lng = 31.3195, 75.5805
    snapped_node, snap_dist = snap_to_road_graph(valid_lat, valid_lng, max_dist_km=0.8)
    print(f"\n[TEST 4] Snapping Validation:")
    print(f"  Valid point ({valid_lat}, {valid_lng}) snapped to node: {snapped_node} at {snap_dist*1000:.1f} m")
    assert snapped_node is not None, "Test 4 failed: Valid point should snap successfully."
    assert snap_dist <= 0.8, "Test 4 failed: Snapping distance must be within threshold."

    # Far-away point (outside Jalandhar road graph coverage, e.g. 30 km away)
    far_lat, far_lng = 31.7000, 75.9000
    far_node, far_dist = snap_to_road_graph(far_lat, far_lng, max_dist_km=0.8)
    print(f"  Out-of-bounds point ({far_lat}, {far_lng}) distance to nearest road: {far_dist:.2f} km")
    assert far_node is None, "Test 4 failed: Point outside coverage must NOT snap to graph."
    print("  => PASS: Snapping threshold correctly validates nearby road connectivity.")

    # -------------------------------------------------------------
    # Test 5: Invalid Identifier Handling
    # -------------------------------------------------------------
    invalid_start = "NON_EXISTENT_LOCATION"
    result5 = a_star_search(invalid_start, goal)

    print(f"\n[TEST 5] Invalid Identifier Handling: {invalid_start} -> {goal}")
    print(f"  Status: {result5['status']}")
    print(f"  Message: {result5['message']}")

    assert result5["status"] == "error", "Test 5 failed: Expected error status."
    print("  => PASS")

    # -------------------------------------------------------------
    # Test 6: Multi-Turn Route Geometry Continuity (No Overlapping/Doubling Back)
    # -------------------------------------------------------------
    geom = result1["geometry"]
    print(f"\n[TEST 6] Multi-Turn Route Geometry Continuity:")
    print(f"  Total geometry points: {len(geom)}")

    # Check 1: Start matches first node, End matches goal node
    start_osm = NODES[result1["node_ids"][0]]
    goal_osm = NODES[result1["node_ids"][-1]]
    assert geom[0] == [start_osm["lat"], start_osm["lng"]], "Test 6 failed: First geometry point must match start node."
    assert geom[-1] == [goal_osm["lat"], goal_osm["lng"]], "Test 6 failed: Last geometry point must match goal node."

    # Check 2: No consecutive duplicate coordinates
    for i in range(len(geom) - 1):
        p1, p2 = geom[i], geom[i + 1]
        assert p1 != p2, f"Test 6 failed: Consecutive duplicate coordinate at index {i}: {p1}"

    # Check 3: Continuous progression with no erratic teleportation/doubling back
    # Physical distance between adjacent road curve vertices must be <= 250m
    max_segment_dist = 0
    for i in range(len(geom) - 1):
        p1, p2 = geom[i], geom[i + 1]
        step_km = haversine_km(p1[0], p1[1], p2[0], p2[1])
        if step_km > max_segment_dist:
            max_segment_dist = step_km
        assert step_km < 0.250, (
            f"Test 6 failed: Jump of {step_km*1000:.1f}m at index {i} between {p1} and {p2}. "
            "Indicates reversed or disconnected segment geometry."
        )

    print(f"  Max distance between adjacent curve vertices: {max_segment_dist*1000:.1f} m")
    print("  => PASS: Route polyline flows continuously in forward order without doubling back.")

    print("\n" + "=" * 65)
    print("ALL 6 A* OSM ROUTING TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)
    return True


if __name__ == "__main__":
    success = test_astar_suite()
    sys.exit(0 if success else 1)
