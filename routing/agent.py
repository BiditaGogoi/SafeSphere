"""
SafeRoute - Goal-Based Agent & Rule-Based Reasoning (Stage 5)
Selects the nearest reachable help point using our pure Python A* algorithm on OSM data.
Includes transparent IF-THEN rules and Demo SOS safety workflow.

Designed for 2nd-year B.Tech AI Foundation CA1 viva:
- Simple functions, loops, dictionaries, and transparent decision logic.
- Evaluates candidates by actual calculated road distance, not straight-line distance.
- Clearly documents all locations as academic demonstration points.
"""

import time
from routing.astar import a_star_search, DEMO_HUBS_CONFIG, resolve_node_id, NODES


# =====================================================================
# 1. CANDIDATE HELP POINTS FOR THE AGENT
# Academic demonstration safe points in central Jalandhar.
# =====================================================================

def get_help_point_candidates():
    """
    Returns list of candidate help points available in the road network.
    Excludes isolated test nodes unless requested.
    """
    candidates = []
    for hub_id, hub in DEMO_HUBS_CONFIG.items():
        if hub.get("type") == "help_point":
            entry = dict(hub)
            candidates.append(entry)
    return candidates


# =====================================================================
# 2. GOAL-BASED AGENT
# Percept: Current starting location.
# Goal: Reach the closest reachable safe help point along the road network.
# Reasoning:
#   IF start is invalid -> RETURN validation error.
#   FOR each candidate help point:
#       Compute route using our custom A* algorithm.
#       IF candidate is reachable -> ALLOW agent to evaluate its road distance.
#   IF no candidate is reachable -> EXPLAIN no route found.
#   ELSE -> SELECT candidate with MINIMUM road distance.
# =====================================================================

def select_nearest_help_point(start_input, candidate_list=None):
    """
    Goal-Based Agent function that evaluates all available help points
    using A* road distance and selects the optimal reachable safe point.
    """
    # Rule 1: Validate start location
    resolved_start, err_start = resolve_node_id(start_input)
    if err_start:
        return {
            "status": "error",
            "message": f"Rule Violation: Invalid starting location ({err_start})",
            "selected_help_point": None,
            "route": [],
            "geometry": [],
            "road_distance_km": 0.0,
            "straight_line_distance_km": 0.0,
            "candidates_evaluated": []
        }

    if candidate_list is None:
        candidate_list = get_help_point_candidates()

    evaluated_candidates = []
    best_candidate = None
    best_route = None
    min_road_distance = float("inf")

    # Evaluate each help point candidate
    for candidate in candidate_list:
        route_result = a_star_search(resolved_start, candidate["id"])

        # Rule 2: Check reachability
        if route_result.get("status") == "success":
            road_dist = route_result.get("road_distance_km", float("inf"))
            straight_dist = route_result.get("straight_line_distance_km", 0.0)

            eval_entry = {
                "id": candidate["id"],
                "name": candidate["name"],
                "reachable": True,
                "road_distance_km": road_dist,
                "straight_line_distance_km": straight_dist,
            }
            evaluated_candidates.append(eval_entry)

            # Rule 3: Goal-based utility comparison (minimize road distance)
            if road_dist < min_road_distance:
                min_road_distance = road_dist
                best_candidate = candidate
                best_route = route_result
        else:
            evaluated_candidates.append({
                "id": candidate["id"],
                "name": candidate["name"],
                "reachable": False,
                "road_distance_km": None,
                "straight_line_distance_km": route_result.get("straight_line_distance_km", 0.0),
            })

    # Rule 4: If no help point is reachable
    if best_candidate is None or best_route is None:
        return {
            "status": "no_reachable_help_point",
            "message": "Rule-Based Agent: No safe help point is currently reachable along connected roads.",
            "selected_help_point": None,
            "route": [],
            "geometry": [],
            "road_distance_km": 0.0,
            "straight_line_distance_km": 0.0,
            "candidates_evaluated": evaluated_candidates,
            "disclaimer": "Academic demo: All help points are demonstration locations."
        }

    return {
        "status": "success",
        "message": f"Goal-Based Agent selected '{best_candidate['name']}' as the closest reachable safe point ({best_route['road_distance_km']} km away).",
        "selected_help_point": best_candidate,
        "road_distance_km": best_route["road_distance_km"],
        "straight_line_distance_km": best_route["straight_line_distance_km"],
        "route": best_route["route"],
        "node_ids": best_route["node_ids"],
        "geometry": best_route["geometry"],
        "candidates_evaluated": evaluated_candidates,
        "reasoning": (
            f"Evaluated {len(evaluated_candidates)} candidate help points using pure Python A* search. "
            f"Selected '{best_candidate['name']}' because it has the minimum road distance ({best_route['road_distance_km']} km)."
        ),
        "disclaimer": (
            "DEMONSTRATION SAFE POINT: Academic demonstration point for viva evaluation. "
            "Not an official emergency dispatch service."
        )
    }


# =====================================================================
# 3. RULE-BASED REASONING: DEMO SOS WORKFLOW
# Rule:
#   IF user triggers SOS:
#       IF NOT confirmed:
#           RETURN confirmation_required prompt.
#       IF confirmed:
#           EXECUTE goal-based agent to find nearest safe help point.
#           RETURN demonstration alert without claiming real service contact.
# =====================================================================

def trigger_demo_sos(start_input, confirmed=False):
    """
    Executes the Demo SOS workflow with mandatory confirmation rule.
    Strictly avoids claiming real 911/police/SMS dispatch.
    """
    # Rule 1: Confirmation requirement before executing safety workflow
    if not confirmed:
        return {
            "status": "confirmation_required",
            "message": "Rule Check: Demo SOS requires explicit user confirmation before activating.",
            "alert_triggered": False,
            "disclaimer": "Safety Notice: This is an academic demonstration workflow only."
        }

    # Rule 2: Execute goal-based agent to select nearest help point
    agent_result = select_nearest_help_point(start_input)

    # Rule 3: Format simulated demonstration response
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    
    if agent_result["status"] == "success":
        return {
            "status": "demo_alert_triggered",
            "alert_triggered": True,
            "timestamp": timestamp_str,
            "message": (
                f"SIMULATED DEMO SOS ACTIVATED: The goal-based agent has routed to the nearest assistance post: "
                f"{agent_result['selected_help_point']['name']} ({agent_result['road_distance_km']} km)."
            ),
            "selected_help_point": agent_result["selected_help_point"],
            "road_distance_km": agent_result["road_distance_km"],
            "straight_line_distance_km": agent_result["straight_line_distance_km"],
            "route": agent_result["route"],
            "node_ids": agent_result["node_ids"],
            "geometry": agent_result["geometry"],
            "candidates_evaluated": agent_result["candidates_evaluated"],
            "reasoning": agent_result["reasoning"],
            "disclaimer": (
                "ACADEMIC DEMONSTRATION ONLY: This is a classroom simulation for second-year B.Tech evaluation. "
                "No police dispatch, SMS alert, or emergency personnel were notified."
            )
        }
    else:
        return {
            "status": "demo_alert_failed",
            "alert_triggered": False,
            "timestamp": timestamp_str,
            "message": f"Demo SOS could not route: {agent_result.get('message')}",
            "selected_help_point": None,
            "route": [],
            "geometry": [],
            "disclaimer": "Academic demonstration: No real emergency services contacted."
        }

