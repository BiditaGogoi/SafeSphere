"""
SafeRoute - OpenStreetMap Graph Builder (Stage 4)
Acquires and prepares a walkable road graph for central Jalandhar using OSMnx.
Extracts connected road segments with lengths (km) and detailed curved geometries.
Caches the result to 'data/jalandhar_walk_graph.json' for fast, offline reproducibility.
"""

import os
import json
import networkx as nx
import osmnx as ox

# Focused central Jalandhar coordinate and manageable radius (covers Model Town, BMC Chowk, Jyoti Chowk, Civil Hospital, Railway Station)
CENTER_LAT = 31.3200
CENTER_LNG = 75.5800
RADIUS_METERS = 1800

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_FILE = os.path.join(PROJECT_ROOT, "data", "jalandhar_walk_graph.json")

# Public Overpass endpoints for reliability
OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def download_and_cache_graph(force_download=False):
    """
    Downloads the walkable road network from OpenStreetMap and caches as JSON.
    If cached file already exists and force_download is False, returns existing file path.
    """
    if os.path.exists(CACHE_FILE) and not force_download:
        print(f"[OSM Graph] Using cached road graph from: {CACHE_FILE}")
        return CACHE_FILE

    print(f"[OSM Graph] Querying OpenStreetMap for central Jalandhar (radius={RADIUS_METERS}m, network_type='walk')...")

    G = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            print(f"[OSM Graph] Attempting download via {endpoint}...")
            ox.settings.overpass_endpoint = endpoint
            ox.settings.requests_timeout = 60
            G = ox.graph_from_point((CENTER_LAT, CENTER_LNG), dist=RADIUS_METERS, network_type="walk")
            if G and len(G.nodes) > 0:
                print(f"[OSM Graph] Download successful from {endpoint}")
                break
        except Exception as e:
            print(f"[OSM Graph] Warning: Endpoint {endpoint} failed: {e}")

    if G is None or len(G.nodes) == 0:
        raise RuntimeError("Failed to download road graph from all configured OpenStreetMap endpoints.")

    # 1. Convert to undirected graph for walkable access (pedestrians can walk in both directions)
    G_undir = ox.convert.to_undirected(G)

    # 2. Extract largest connected component to ensure graph connectivity
    largest_cc = max(nx.connected_components(G_undir), key=len)
    G_sub = G_undir.subgraph(largest_cc).copy()

    # 3. Format nodes dictionary
    nodes_dict = {}
    for n, data in G_sub.nodes(data=True):
        nodes_dict[str(n)] = {
            "id": str(n),
            "lat": round(data["y"], 6),
            "lng": round(data["x"], 6),
        }

    # 4. Format adjacency edges with lengths in kilometers and strictly oriented geometry
    edges_dict = {str(n): [] for n in nodes_dict}
    edge_count = 0

    for u, v, data in G_sub.edges(data=True):
        u_str = str(u)
        v_str = str(v)
        u_lat, u_lng = nodes_dict[u_str]["lat"], nodes_dict[u_str]["lng"]
        v_lat, v_lng = nodes_dict[v_str]["lat"], nodes_dict[v_str]["lng"]

        length_m = float(data.get("length", 0.0))
        length_km = round(length_m / 1000.0, 4)

        # Extract true curved geometry coordinates if present in OSM way
        if "geometry" in data:
            raw_coords = [[round(lat, 6), round(lng, 6)] for lng, lat in data["geometry"].coords]
        else:
            raw_coords = [
                [u_lat, u_lng],
                [v_lat, v_lng],
            ]

        # Verify orientation: does raw_coords start closer to u or to v?
        d_u = (raw_coords[0][0] - u_lat) ** 2 + (raw_coords[0][1] - u_lng) ** 2
        d_v = (raw_coords[0][0] - v_lat) ** 2 + (raw_coords[0][1] - v_lng) ** 2

        if d_v < d_u:
            # raw_coords was oriented v -> u in OSM way
            forward_coords = list(reversed(raw_coords))
            backward_coords = list(raw_coords)
        else:
            # raw_coords was oriented u -> v
            forward_coords = list(raw_coords)
            backward_coords = list(reversed(raw_coords))

        # Anchor exact endpoints to node coordinates
        forward_coords[0] = [u_lat, u_lng]
        forward_coords[-1] = [v_lat, v_lng]
        backward_coords[0] = [v_lat, v_lng]
        backward_coords[-1] = [u_lat, u_lng]

        # Forward edge (u -> v)
        edges_dict[u_str].append({
            "target": v_str,
            "length_km": length_km,
            "geometry": forward_coords,
        })

        # Reverse edge (v -> u)
        edges_dict[v_str].append({
            "target": u_str,
            "length_km": length_km,
            "geometry": backward_coords,
        })
        edge_count += 1

    payload = {
        "area": "Jalandhar Central Walkable Network",
        "center": {"lat": CENTER_LAT, "lng": CENTER_LNG},
        "radius_meters": RADIUS_METERS,
        "network_type": "walk",
        "disclaimer": "OpenStreetMap academic demonstration road graph. Coverage can be incomplete; not a guarantee of pedestrian safety.",
        "nodes": nodes_dict,
        "edges": edges_dict,
    }

    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    print(f"[OSM Graph] Successfully saved {len(nodes_dict)} nodes and {edge_count} edges to {CACHE_FILE}")
    return CACHE_FILE


if __name__ == "__main__":
    download_and_cache_graph(force_download=True)
