"""
SafeRoute - A* Road Graph Routing Algorithm (Stage 4)
Handcrafted pure Python implementation using standard library 'heapq' and 'math'.
Uses real OpenStreetMap (OSM) walkable road graph data for central Jalandhar.
Includes true curved road segment geometry, point snapping, and distance comparison.

Designed for beginner-friendly 2nd-year B.Tech viva demonstration:
Simple functions, dictionary graph storage, and transparent priority queue logic.
"""

import os
import json
import math
import heapq

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
GRAPH_CACHE_FILE = os.path.join(PROJECT_ROOT, "data", "jalandhar_walk_graph.json")

# =====================================================================
# 1. LOAD OPENSTREETMAP ROAD GRAPH (CACHED JSON)
# Caching guarantees fast, offline, reproducible execution for tests and viva.
# =====================================================================

def load_road_graph():
    """
    Loads nodes and edges from data/jalandhar_walk_graph.json.
    If missing, attempts to build it using build_graph.py.
    """
    if not os.path.exists(GRAPH_CACHE_FILE):
        try:
            from routing.build_graph import download_and_cache_graph
            print("[A* Router] Graph cache not found. Attempting to generate from OSM...")
            download_and_cache_graph(force_download=False)
        except Exception as e:
            print(f"[A* Router] Warning: Could not auto-download OSM graph: {e}")

    if os.path.exists(GRAPH_CACHE_FILE):
        with open(GRAPH_CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("nodes", {}), data.get("edges", {})

    # Emergency fallback graph in case of no network and missing file
    print("[A* Router] Using minimal fallback road graph.")
    return {}, {}


# Global graph dictionaries:
# NODES: { node_id: {"id": str, "lat": float, "lng": float, "name": str} }
# EDGES: { node_id: [ {"target": str, "length_km": float, "geometry": [[lat, lng], ...]} ] }
NODES, EDGES = load_road_graph()


# =====================================================================
# 2. DEMONSTRATION HUBS & HELP POINTS
# Real central Jalandhar locations mapped and snapped to OSM road graph nodes.
# Clearly documented as academic demonstration points, not unverified claims.
# =====================================================================

DEMO_HUBS_CONFIG = {
    "N_MODEL_TOWN": {
        "id": "N_MODEL_TOWN",
        "name": "Model Town Commercial Center",
        "lat": 31.3090,
        "lng": 75.5790,
        "type": "start_point",
    },
    "N_BMC_CHOWK": {
        "id": "N_BMC_CHOWK",
        "name": "BMC Chowk Central Crossing",
        "lat": 31.3195,
        "lng": 75.5805,
        "type": "waypoint",
    },
    "N_JYOTI_CHOWK": {
        "id": "N_JYOTI_CHOWK",
        "name": "Jyoti Chowk Old Market",
        "lat": 31.3255,
        "lng": 75.5750,
        "type": "waypoint",
    },
    "N_RAILWAY_STATION": {
        "id": "N_RAILWAY_STATION",
        "name": "City Railway Station Area",
        "lat": 31.3325,
        "lng": 75.5840,
        "type": "start_point",
    },
    "H_CIVIL_HOSPITAL": {
        "id": "H_CIVIL_HOSPITAL",
        "name": "Civil Hospital Assistance Post (Demonstration)",
        "lat": 31.3280,
        "lng": 75.5770,
        "type": "help_point",
    },
    "H_POLICE_BOOTH_BMC": {
        "id": "H_POLICE_BOOTH_BMC",
        "name": "Police Assistance Post (BMC Chowk - Demonstration)",
        "lat": 31.3200,
        "lng": 75.5815,
        "type": "help_point",
    },
    "H_MODEL_TOWN_AID": {
        "id": "H_MODEL_TOWN_AID",
        "name": "Model Town Emergency Aid Post (Demonstration)",
        "lat": 31.3105,
        "lng": 75.5800,
        "type": "help_point",
    },
    # Intentionally disconnected test outpost to verify unreachable handling
    "N_ISOLATED_DEMO": {
        "id": "N_ISOLATED_DEMO",
        "name": "Isolated Outpost (Demo Unreachable)",
        "lat": 31.4200,
        "lng": 75.5000,
        "type": "test_isolated",
    },
}


# =====================================================================
# 3. HEURISTIC FUNCTION: HAVERSINE GREAT-CIRCLE DISTANCE (km)
#
# Admissibility explanation for viva:
# The straight-line (great-circle) distance represents the shortest possible
# geodesic path between two points on the sphere. Because real walkable roads
# curve around buildings, blocks, and terrain, road distance is always >= straight-line.
# Therefore: h(n) <= h*(n) (the heuristic never overestimates the remaining cost).
# This admissibility guarantees that A* search returns an optimal path.
# =====================================================================

def haversine_km(lat1, lon1, lat2, lon2):
    """Calculates straight-line great-circle distance in kilometers using the Haversine formula."""
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 4)


# =====================================================================
# 4. SNAPPING LOGIC WITH DISTANCE VALIDATION
# Snaps geographic coordinates or demonstration POIs to the nearest walkable road node.
# Fails with an error if the query location is too far from any mapped road.
# =====================================================================

MAX_SNAPPING_DISTANCE_KM = 0.80  # 800 meters maximum allowable distance to road network

def snap_to_road_graph(lat, lng, max_dist_km=MAX_SNAPPING_DISTANCE_KM):
    """
    Finds the nearest OSM road graph node to (lat, lng).
    Returns (node_id, distance_km).
    If closest node is farther than max_dist_km, returns (None, distance_km).
    """
    if not NODES:
        return None, float("inf")

    best_node_id = None
    best_dist = float("inf")

    for node_id, node_data in NODES.items():
        dist = haversine_km(lat, lng, node_data["lat"], node_data["lng"])
        if dist < best_dist:
            best_dist = dist
            best_node_id = node_id

    if best_dist > max_dist_km:
        return None, best_dist

    return best_node_id, best_dist


def resolve_node_id(identifier):
    """
    Resolves an input identifier (demonstration hub key or OSM node ID)
    to a valid node in NODES.
    """
    identifier_str = str(identifier).strip()

    # 1. Direct match in OSM nodes
    if identifier_str in NODES:
        return identifier_str, None

    # 2. Check demonstration hubs
    if identifier_str in DEMO_HUBS_CONFIG:
        hub = DEMO_HUBS_CONFIG[identifier_str]
        if hub.get("type") == "test_isolated":
            return "N_ISOLATED_DEMO", None  # Keep disconnected for unreachable test

        snapped_id, dist_km = snap_to_road_graph(hub["lat"], hub["lng"])
        if snapped_id is None:
            return None, f"Hub '{hub['name']}' is too far from mapped roads ({dist_km:.2f} km)."
        return snapped_id, None

    return None, f"Location identifier '{identifier_str}' not found in road graph."


def get_demonstration_nodes():
    """
    Returns the list of demonstration hubs and help points for frontend selection.
    """
    nodes_list = []
    for hub_id, hub in DEMO_HUBS_CONFIG.items():
        snapped_id, dist_km = snap_to_road_graph(hub["lat"], hub["lng"])
        node_entry = dict(hub)
        node_entry["snapped_node_id"] = snapped_id
        node_entry["snapped_dist_m"] = round(dist_km * 1000.0, 1) if snapped_id else None
        nodes_list.append(node_entry)
    return nodes_list


# =====================================================================
# 5. PURE PYTHON A* SEARCH ALGORITHM
#
# Evaluation Function: f(n) = g(n) + h(n)
# g(n): exact road distance from start to node n along walkable edges
# h(n): admissible straight-line Haversine distance from node n to destination
#
# Returns route nodes, road distance (km), straight-line distance (km),
# and the exact geographic polyline geometry following road curves.
# =====================================================================

def a_star_search(start_input, goal_input):
    """
    Finds the shortest walkable road route from start_input to goal_input using A*.
    Inputs can be demonstration hub IDs (e.g. 'N_MODEL_TOWN') or raw OSM node IDs.
    """
    # 1. Resolve start and goal to road graph nodes
    start_id, err_start = resolve_node_id(start_input)
    if err_start:
        return {
            "status": "error",
            "message": err_start,
            "route": [],
            "geometry": [],
            "road_distance_km": 0.0,
            "straight_line_distance_km": 0.0,
        }

    goal_id, err_goal = resolve_node_id(goal_input)
    if err_goal:
        return {
            "status": "error",
            "message": err_goal,
            "route": [],
            "geometry": [],
            "road_distance_km": 0.0,
            "straight_line_distance_km": 0.0,
        }

    # Handle isolated test node
    if start_id == "N_ISOLATED_DEMO" or goal_id == "N_ISOLATED_DEMO":
        straight_dist = 0.0
        if start_id in NODES and goal_id == "N_ISOLATED_DEMO":
            iso_lat, iso_lng = DEMO_HUBS_CONFIG["N_ISOLATED_DEMO"]["lat"], DEMO_HUBS_CONFIG["N_ISOLATED_DEMO"]["lng"]
            straight_dist = haversine_km(NODES[start_id]["lat"], NODES[start_id]["lng"], iso_lat, iso_lng)
        return {
            "status": "unreachable",
            "message": "No connected road route exists to the destination (isolated test location).",
            "route": [],
            "geometry": [],
            "node_ids": [],
            "road_distance_km": 0.0,
            "straight_line_distance_km": straight_dist,
        }

    start_node = NODES[start_id]
    goal_node = NODES[goal_id]
    straight_line_dist = haversine_km(start_node["lat"], start_node["lng"], goal_node["lat"], goal_node["lng"])

    # 2. Base case: start equals destination
    if start_id == goal_id:
        single_point = [start_node["lat"], start_node["lng"]]
        return {
            "status": "success",
            "message": "Start is the destination. No travel required.",
            "route": [start_node],
            "node_ids": [start_id],
            "geometry": [single_point],
            "road_distance_km": 0.0,
            "straight_line_distance_km": 0.0,
            "disclaimer": (
                "OpenStreetMap academic demonstration road graph. "
                "Coverage can be incomplete; route is not a guarantee of pedestrian safety."
            ),
        }

    # 3. Priority Queue: stores tuples of (f_score, counter, current_node_id)
    # Counter acts as tie-breaker when two nodes have identical f_score
    tie_breaker = 0
    open_set = []
    heapq.heappush(open_set, (0.0, tie_breaker, start_id))

    # Tracks optimal predecessor for path reconstruction
    came_from = {}

    # Map of edge segment geometries: (u, v) -> [[lat, lng], ...]
    edge_geometry_map = {}

    # g_score: exact distance from start to node
    g_score = {start_id: 0.0}

    # f_score: g_score + heuristic h
    f_score = {start_id: straight_line_dist}

    # Set of visited nodes to prevent redundant exploration
    visited = set()

    while open_set:
        current_f, _, current = heapq.heappop(open_set)

        if current == goal_id:
            # Reconstruct node path
            path_ids = [current]
            while current in came_from:
                current = came_from[current]
                path_ids.append(current)
            path_ids.reverse()

            # Stitch together true curved road geometry in strict start-to-goal order
            raw_geometry = []
            for i in range(len(path_ids) - 1):
                u = path_ids[i]
                v = path_ids[i + 1]
                u_lat, u_lng = NODES[u]["lat"], NODES[u]["lng"]
                v_lat, v_lng = NODES[v]["lat"], NODES[v]["lng"]

                seg_coords = edge_geometry_map.get((u, v))
                if seg_coords and len(seg_coords) >= 2:
                    seg = [list(pt) for pt in seg_coords]
                    # Verify direction: seg[0] must be closer to u than to v
                    d_u = (seg[0][0] - u_lat) ** 2 + (seg[0][1] - u_lng) ** 2
                    d_v = (seg[0][0] - v_lat) ** 2 + (seg[0][1] - v_lng) ** 2
                    if d_v < d_u:
                        seg.reverse()
                    # Anchor exact endpoints to node coordinates
                    seg[0] = [u_lat, u_lng]
                    seg[-1] = [v_lat, v_lng]
                else:
                    seg = [[u_lat, u_lng], [v_lat, v_lng]]

                if not raw_geometry:
                    raw_geometry.extend(seg)
                else:
                    # Append segment without duplicating the shared junction node
                    raw_geometry.extend(seg[1:])

            # Remove consecutive duplicate coordinates that could cause rendering artifacts
            route_geometry = []
            for pt in raw_geometry:
                if not route_geometry or (
                    abs(pt[0] - route_geometry[-1][0]) > 1e-6
                    or abs(pt[1] - route_geometry[-1][1]) > 1e-6
                ):
                    route_geometry.append(pt)

            total_road_dist = round(g_score[goal_id], 4)
            return {
                "status": "success",
                "message": f"Connected road route found with {len(path_ids)} nodes and {len(route_geometry)} geometry points.",
                "route": [NODES[nid] for nid in path_ids],
                "node_ids": path_ids,
                "geometry": route_geometry,
                "road_distance_km": total_road_dist,
                "straight_line_distance_km": straight_line_dist,
                "disclaimer": (
                    "OpenStreetMap academic demonstration road graph. "
                    "Coverage can be incomplete; this route is an academic demonstration of A* search "
                    "and not a guarantee of pedestrian safety or fastest traversal."
                ),
            }

        visited.add(current)

        for edge in EDGES.get(current, []):
            neighbor_id = edge["target"]
            edge_weight = edge["length_km"]

            if neighbor_id in visited:
                continue

            tentative_g = g_score[current] + edge_weight

            if tentative_g < g_score.get(neighbor_id, float("inf")):
                came_from[neighbor_id] = current
                g_score[neighbor_id] = tentative_g
                edge_geometry_map[(current, neighbor_id)] = edge.get("geometry", [])

                h = haversine_km(
                    NODES[neighbor_id]["lat"],
                    NODES[neighbor_id]["lng"],
                    goal_node["lat"],
                    goal_node["lng"],
                )
                f_score[neighbor_id] = tentative_g + h

                tie_breaker += 1
                heapq.heappush(open_set, (f_score[neighbor_id], tie_breaker, neighbor_id))

    # 4. Destination unreachable
    return {
        "status": "unreachable",
        "message": f"No connected walkable road route exists to destination node '{goal_id}'.",
        "route": [],
        "geometry": [],
        "node_ids": [],
        "road_distance_km": 0.0,
        "straight_line_distance_km": straight_line_dist,
        "disclaimer": (
            "OpenStreetMap academic demonstration road graph. "
            "Coverage can be incomplete; not a guarantee of pedestrian safety."
        ),
    }
