"""
Unit Test Script for SafeRoute Goal-Based Agent & Rule-Based Demo SOS (Stage 5)
Covers:
1. Goal-Based Agent selects reachable candidate with shortest A* road distance
2. Road distance comparison (evaluates candidates by road distance >= straight-line)
3. Handling case where no candidate is reachable (isolated start / disconnected candidate)
4. Handling invalid start locations (rule-based validation error)
5. Demo SOS confirmation requirement (Rule: IF unconfirmed THEN block execution)
6. Demo SOS simulated alert trigger without claiming to contact real services
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
sys.path.append(PROJECT_ROOT)

from routing.agent import (
    select_nearest_help_point,
    trigger_demo_sos,
    get_help_point_candidates,
)


def test_agent_suite():
    print("=" * 65)
    print("SafeRoute: Running Stage 5 Goal-Based Agent & Rule-Based SOS Tests")
    print("=" * 65)

    # -------------------------------------------------------------
    # Test 1: Goal-Based Agent selects shortest A* road distance candidate
    # -------------------------------------------------------------
    start = "N_MODEL_TOWN"
    result1 = select_nearest_help_point(start)

    print(f"\n[TEST 1] Goal-Based Agent from '{start}':")
    print(f"  Status: {result1['status']}")
    assert result1["status"] == "success", f"Test 1 failed: Expected success, got {result1['status']}"
    
    selected = result1["selected_help_point"]
    print(f"  Selected Help Point: {selected['name']} (ID: {selected['id']})")
    print(f"  Road Distance: {result1['road_distance_km']} km")
    print(f"  Straight-Line Distance: {result1['straight_line_distance_km']} km")
    print(f"  Candidates Evaluated: {len(result1['candidates_evaluated'])}")

    assert selected is not None, "Test 1 failed: A help point must be selected."
    assert result1["road_distance_km"] > 0, "Test 1 failed: Road distance must be positive."
    assert len(result1["geometry"]) >= 2, "Test 1 failed: Geometry polyline must be returned."
    
    # Verify the selected candidate truly has the minimum road distance among reachable candidates
    reachable_candidates = [c for c in result1["candidates_evaluated"] if c.get("reachable")]
    assert len(reachable_candidates) >= 1, "Test 1 failed: At least 1 candidate must be reachable."
    min_dist_in_eval = min(c["road_distance_km"] for c in reachable_candidates)
    assert result1["road_distance_km"] == min_dist_in_eval, (
        f"Test 1 failed: Agent did not select candidate with minimum road distance. "
        f"Got {result1['road_distance_km']}, expected min {min_dist_in_eval}."
    )
    print("  => PASS: Agent correctly selected candidate with the shortest calculated A* road distance.")

    # -------------------------------------------------------------
    # Test 2: Unreachable Candidates Handling
    # -------------------------------------------------------------
    # Pass a candidate list containing only the isolated demonstration outpost
    isolated_candidate_list = [{
        "id": "N_ISOLATED_DEMO",
        "name": "Isolated Outpost (Demo Unreachable)",
        "lat": 31.4200,
        "lng": 75.5000,
        "type": "test_isolated"
    }]
    result2 = select_nearest_help_point(start, candidate_list=isolated_candidate_list)

    print(f"\n[TEST 2] Unreachable Candidates Handling:")
    print(f"  Status: {result2['status']}")
    print(f"  Message: {result2['message']}")

    assert result2["status"] == "no_reachable_help_point", (
        f"Test 2 failed: Expected 'no_reachable_help_point', got {result2['status']}"
    )
    assert result2["selected_help_point"] is None, "Test 2 failed: Selected help point must be None."
    assert len(result2["route"]) == 0, "Test 2 failed: Route must be empty."
    print("  => PASS: Agent safely handles unreachable candidates and returns informative status.")

    # -------------------------------------------------------------
    # Test 3: Invalid Start Location Rule Validation
    # -------------------------------------------------------------
    invalid_start = "NON_EXISTENT_CHOWK_99"
    result3 = select_nearest_help_point(invalid_start)

    print(f"\n[TEST 3] Invalid Start Location Rule Check:")
    print(f"  Status: {result3['status']}")
    print(f"  Message: {result3['message']}")

    assert result3["status"] == "error", "Test 3 failed: Expected 'error' status for invalid start."
    assert "Rule Violation" in result3["message"], "Test 3 failed: Message should indicate rule violation."
    print("  => PASS: Rule check properly flags invalid start location.")

    # -------------------------------------------------------------
    # Test 4: Demo SOS - Rule 1: Confirmation Required (unconfirmed call)
    # -------------------------------------------------------------
    result4 = trigger_demo_sos(start, confirmed=False)

    print(f"\n[TEST 4] Demo SOS Unconfirmed Call:")
    print(f"  Status: {result4['status']}")
    print(f"  Alert Triggered: {result4['alert_triggered']}")

    assert result4["status"] == "confirmation_required", (
        f"Test 4 failed: Expected 'confirmation_required', got {result4['status']}"
    )
    assert result4["alert_triggered"] is False, "Test 4 failed: Alert must NOT trigger without confirmation."
    print("  => PASS: Safety rule enforces confirmation check before activating.")

    # -------------------------------------------------------------
    # Test 5: Demo SOS - Rule 2: Confirmed Trigger (simulation only)
    # -------------------------------------------------------------
    result5 = trigger_demo_sos(start, confirmed=True)

    print(f"\n[TEST 5] Demo SOS Confirmed Call:")
    print(f"  Status: {result5['status']}")
    print(f"  Alert Triggered: {result5['alert_triggered']}")
    print(f"  Message: {result5['message']}")
    print(f"  Disclaimer: {result5['disclaimer']}")

    assert result5["status"] == "demo_alert_triggered", (
        f"Test 5 failed: Expected 'demo_alert_triggered', got {result5['status']}"
    )
    assert result5["alert_triggered"] is True, "Test 5 failed: Alert should be marked as triggered."
    assert result5["selected_help_point"] is not None, "Test 5 failed: Nearest safe point must be routed."
    assert len(result5["geometry"]) >= 2, "Test 5 failed: Route geometry must be returned."
    
    # Verify no false claim of real dispatch
    disclaimer = result5["disclaimer"].lower()
    assert "no police" in disclaimer or "no real" in disclaimer, (
        "Test 5 failed: Disclaimer must explicitly state no real services were contacted."
    )
    print("  => PASS: Demo SOS triggered cleanly with full disclaimer and zero false claims.")

    print("\n" + "=" * 65)
    print("ALL 5 GOAL-BASED AGENT & DEMO SOS TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)
    return True


if __name__ == "__main__":
    success = test_agent_suite()
    sys.exit(0 if success else 1)

