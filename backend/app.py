"""
SafeRoute Backend - Flask REST API (Stage 2 & Stage 3)
Serves synthetic risk zones and provides Decision Tree ML risk prediction.
Designed for 2nd-year B.Tech viva demonstration.
"""

import os
import csv
import sys
import json
import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
sys.path.append(PROJECT_ROOT)

from data.validate_data import validate_dataset
from routing.astar import a_star_search, NODES, get_demonstration_nodes, snap_to_road_graph
from routing.agent import select_nearest_help_point, trigger_demo_sos

app = Flask(__name__)
CORS(app)

CSV_FILE_PATH = os.path.join(PROJECT_ROOT, "data", "synthetic_risk_zones.csv")
MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "risk_model.joblib")
META_PATH = os.path.join(PROJECT_ROOT, "ml", "model_meta.json")

# Global model and metadata variables
model = None
model_meta = {}


def init_ml_model():
    """Loads the trained DecisionTree model and metadata from disk."""
    global model, model_meta
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"[ML] Successfully loaded Decision Tree model from {MODEL_PATH}")
        except Exception as e:
            print(f"[ML ERROR] Failed to load model: {e}")
            model = None

    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, "r", encoding="utf-8") as f:
                model_meta = json.load(f)
        except Exception as e:
            print(f"[ML ERROR] Failed to load metadata: {e}")
            model_meta = {}


def load_risk_zones():
    """Reads synthetic_risk_zones.csv and returns list of zone records."""
    zones = []
    if not os.path.exists(CSV_FILE_PATH):
        return zones

    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            zones.append({
                "area_id": row["area_id"],
                "area_name": row["area_name"],
                "lat": float(row["lat"]),
                "lng": float(row["lng"]),
                "radius_meters": int(row["radius_meters"]),
                "time_period": row["time_period"],
                "incident_count": int(row["incident_count"]),
                "lighting_score": int(row["lighting_score"]),
                "crowd_density": int(row["crowd_density"]),
                "risk_label": row["risk_label"].strip().lower(),
                "notes": row["notes"]
            })
    return zones


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint reporting data validation and ML model status."""
    is_valid, errors = validate_dataset(CSV_FILE_PATH)
    return jsonify({
        "status": "healthy",
        "service": "SafeRoute Backend API",
        "ml_model_loaded": model is not None,
        "data_validation": {
            "passed": is_valid,
            "errors": errors
        },
        "disclaimer": "Academic demo only: all risk values are synthetic."
    })


@app.route("/api/zones", methods=["GET"])
def get_risk_zones():
    """Returns all demonstration risk zones in Jalandhar."""
    zones = load_risk_zones()
    return jsonify({
        "status": "success",
        "count": len(zones),
        "disclaimer": "SYNTHETIC DEMONSTRATION DATA: Not real crime statistics in Jalandhar.",
        "data": zones
    })


@app.route("/api/model-info", methods=["GET"])
def get_model_info():
    """Returns training metadata and accuracy for the Decision Tree classifier."""
    if not model_meta:
        return jsonify({"status": "error", "message": "Model metadata not available"}), 404
    return jsonify({
        "status": "success",
        "metadata": model_meta
    })


@app.route("/api/predict", methods=["POST"])
def predict_risk():
    """
    Accepts environmental features and returns predicted risk label + class probabilities.
    Expected JSON:
    {
      "incident_count": 5,
      "lighting_score": 6,
      "crowd_density": 7
    }
    """
    if model is None:
        return jsonify({
            "status": "error",
            "message": "Decision Tree model not loaded. Please run ml/train_classifier.py."
        }), 500

    data = request.get_json(silent=True) or {}
    try:
        incidents = int(data.get("incident_count", 0))
        lighting = int(data.get("lighting_score", 5))
        crowd = int(data.get("crowd_density", 5))

        if incidents < 0 or not (1 <= lighting <= 10) or not (1 <= crowd <= 10):
            return jsonify({
                "status": "error",
                "message": "Invalid ranges: incident_count >= 0, lighting_score 1-10, crowd_density 1-10."
            }), 400
    except (TypeError, ValueError) as e:
        return jsonify({"status": "error", "message": f"Invalid feature types: {e}"}), 400

    # Model inference
    features = np.array([[incidents, lighting, crowd]])
    predicted_class = str(model.predict(features)[0])
    raw_probs = model.predict_proba(features)[0]

    probabilities = {}
    for class_name, prob in zip(model.classes_, raw_probs):
        probabilities[str(class_name)] = round(float(prob), 3)

    return jsonify({
        "status": "success",
        "predicted_risk": predicted_class,
        "probabilities": probabilities,
        "features": {
            "incident_count": incidents,
            "lighting_score": lighting,
            "crowd_density": crowd
        },
        "disclaimer": "SYNTHETIC DEMONSTRATION DATA: Academic Decision Tree prediction for CA1 evaluation. Not a real safety assessment in Jalandhar."
    })


@app.route("/api/predict/<area_id>", methods=["GET"])
def predict_zone_by_id(area_id):
    """Convenience endpoint: looks up a zone by area_id and runs the ML model on its features."""
    zones = load_risk_zones()
    zone = next((z for z in zones if z["area_id"].upper() == area_id.upper()), None)

    if not zone:
        return jsonify({"status": "error", "message": f"Zone '{area_id}' not found"}), 404

    if model is None:
        return jsonify({"status": "error", "message": "Model not loaded"}), 500

    features = np.array([[zone["incident_count"], zone["lighting_score"], zone["crowd_density"]]])
    predicted_class = str(model.predict(features)[0])
    raw_probs = model.predict_proba(features)[0]

    probabilities = {}
    for class_name, prob in zip(model.classes_, raw_probs):
        probabilities[str(class_name)] = round(float(prob), 3)

    return jsonify({
        "status": "success",
        "area_id": zone["area_id"],
        "area_name": zone["area_name"],
        "ground_truth_label": zone["risk_label"],
        "predicted_risk": predicted_class,
        "probabilities": probabilities,
        "features": {
            "incident_count": zone["incident_count"],
            "lighting_score": zone["lighting_score"],
            "crowd_density": zone["crowd_density"]
        },
        "disclaimer": "SYNTHETIC DEMONSTRATION DATA: Decision Tree prediction for CA1 evaluation."
    })


@app.route("/api/nodes", methods=["GET"])
def get_road_nodes():
    """Returns demonstration hubs, help points, and OSM road network summary."""
    demo_nodes = get_demonstration_nodes()
    return jsonify({
        "status": "success",
        "count": len(demo_nodes),
        "total_osm_nodes": len(NODES),
        "disclaimer": "Academic demonstration hubs snapped to real OpenStreetMap walkable road graph.",
        "nodes": demo_nodes
    })


@app.route("/api/route", methods=["GET", "POST"])
def calculate_route():
    """
    Calculates the shortest walkable route using our handcrafted pure Python A* algorithm
    on the real OpenStreetMap road graph of central Jalandhar.
    Accepts JSON body: {"start_node": "...", "goal_node": "..."}
    or coordinates: {"start_lat": ..., "start_lng": ..., "goal_lat": ..., "goal_lng": ...}
    or query parameters: ?start=...&goal=...
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        start_id = data.get("start_node", "").strip()
        goal_id = data.get("goal_node", "").strip()
        start_lat = data.get("start_lat")
        start_lng = data.get("start_lng")
        goal_lat = data.get("goal_lat")
        goal_lng = data.get("goal_lng")
    else:
        start_id = request.args.get("start", "").strip()
        goal_id = request.args.get("goal", "").strip()
        start_lat = request.args.get("start_lat", type=float)
        start_lng = request.args.get("start_lng", type=float)
        goal_lat = request.args.get("goal_lat", type=float)
        goal_lng = request.args.get("goal_lng", type=float)

    # Support snapping from explicit coordinate pairs if provided
    if start_lat is not None and start_lng is not None:
        snapped_start, dist_start = snap_to_road_graph(start_lat, start_lng)
        if not snapped_start:
            return jsonify({
                "status": "error",
                "message": f"Start coordinate ({start_lat}, {start_lng}) is too far from mapped roads ({dist_start:.2f} km).",
                "route": []
            }), 400
        start_id = snapped_start

    if goal_lat is not None and goal_lng is not None:
        snapped_goal, dist_goal = snap_to_road_graph(goal_lat, goal_lng)
        if not snapped_goal:
            return jsonify({
                "status": "error",
                "message": f"Destination coordinate ({goal_lat}, {goal_lng}) is too far from mapped roads ({dist_goal:.2f} km).",
                "route": []
            }), 400
        goal_id = snapped_goal

    if not start_id or not goal_id:
        return jsonify({
            "status": "error",
            "message": "Both start location ('start_node') and goal location ('goal_node') are required.",
            "route": []
        }), 400

    result = a_star_search(start_id, goal_id)

    status_code = 200
    if result["status"] == "error":
        status_code = 400
    elif result["status"] == "unreachable":
        status_code = 404

    return jsonify(result), status_code


@app.route("/api/agent/nearest-help", methods=["POST"])
def agent_nearest_help():
    """
    Stage 5 Goal-Based Agent:
    Evaluates all candidate help points using A* road distance and
    selects the closest reachable safe point.
    Expected JSON: {"start_node": "N_MODEL_TOWN"} or coordinates.
    """
    data = request.get_json(silent=True) or {}
    start_id = data.get("start_node", "").strip()
    start_lat = data.get("start_lat")
    start_lng = data.get("start_lng")

    if start_lat is not None and start_lng is not None:
        snapped_start, dist_start = snap_to_road_graph(start_lat, start_lng)
        if not snapped_start:
            return jsonify({
                "status": "error",
                "message": f"Start coordinate ({start_lat}, {start_lng}) is too far from mapped roads ({dist_start:.2f} km)."
            }), 400
        start_id = snapped_start

    if not start_id:
        return jsonify({
            "status": "error",
            "message": "Start location ('start_node') is required for the Goal-Based Agent."
        }), 400

    result = select_nearest_help_point(start_id)
    status_code = 200
    if result["status"] == "error":
        status_code = 400
    elif result["status"] == "no_reachable_help_point":
        status_code = 404

    return jsonify(result), status_code


@app.route("/api/agent/sos", methods=["POST"])
def agent_demo_sos():
    """
    Stage 5 Rule-Based Reasoning & Demo SOS:
    Requires explicit confirmation before triggering simulated alert.
    Expected JSON: {"start_node": "...", "confirmed": true/false}
    """
    data = request.get_json(silent=True) or {}
    start_id = data.get("start_node", "").strip()
    confirmed = bool(data.get("confirmed", False))

    if not start_id:
        return jsonify({
            "status": "error",
            "message": "Start location ('start_node') is required for Demo SOS."
        }), 400

    result = trigger_demo_sos(start_id, confirmed=confirmed)
    status_code = 200
    if result["status"] == "confirmation_required":
        status_code = 200
    elif result["status"] == "demo_alert_failed":
        status_code = 404
    elif result["status"] == "error":
        status_code = 400

    return jsonify(result), status_code


if __name__ == "__main__":
    print("[INIT] Verifying synthetic dataset...")
    validate_dataset(CSV_FILE_PATH)
    init_ml_model()

    # Read host and port from environment variables for deployment readiness
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 5000))
    print(f"[START] Serving SafeRoute API on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)

