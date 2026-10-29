# SafeRoute AI — Risk Zone Mapping & Intelligent Pedestrian Router

A 2nd-year B.Tech Artificial Intelligence Foundation project demonstrating transparent machine learning risk classification and handcrafted A* graph search on real OpenStreetMap road data for Jalandhar, Punjab.

---

## 📌 Project Overview & Architecture

SafeRoute AI combines geospatial visualization, supervised machine learning, and heuristic graph search to assist pedestrian navigation:

1. **Stage 1 — Data Collection & Integrity:**
   - 12 synthetic demonstration risk zones across central Jalandhar (`data/synthetic_risk_zones.csv`).
   - Automated data validation verifying ranges, coordinates, and types (`data/validate_data.py`).
2. **Stage 2 — Full-Stack Integration:**
   - REST API built with Python & Flask (`backend/app.py`).
   - Responsive web map built with React, Vite, Tailwind CSS, and Leaflet (`frontend/`).
3. **Stage 3 — Supervised Machine Learning Classifier:**
   - Real scikit-learn `DecisionTreeClassifier` (`ml/train_classifier.py`).
   - Classifies risk level (`lower`, `moderate`, `higher`) based on incident counts, lighting score (1–10), and crowd density (1–10).
   - Exports transparent IF–THEN split rules for viva demonstration.
4. **Stage 4 — Real OpenStreetMap Walkable A* Routing:**
   - Genuine central Jalandhar walkable road graph (3,930 nodes, 5,605 edges) acquired via OSMnx and cached locally (`data/jalandhar_walk_graph.json`).
   - Handcrafted pure Python A* algorithm (`routing/astar.py`) using `heapq` and Haversine straight-line heuristic ($f(n) = g(n) + h(n)$).
   - Returns true curved road geometry (`geometry: [[lat, lng], ...]`) following actual street curves without cutting through buildings.
   - Coordinate snapping with 800 m threshold validation and unreachable destination handling.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# (Optional) Run automated tests
python data/validate_data.py
python ml/train_classifier.py
python routing/test_astar.py

# Start Flask API server (http://127.0.0.1:5000)
python backend/app.py
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev
```

---

## 🧪 Running the Test Suites

All components include automated test scripts:

- **Data Integrity Tests:**
  ```bash
  python data/validate_data.py
  ```
- **ML Classifier Training & Evaluation:**
  ```bash
  python ml/train_classifier.py
  ```
- **A* OSM Road Graph Routing Tests:**
  ```bash
  python routing/test_astar.py
  ```

---

## 🎓 Viva & Core AI Concepts

- **Why Haversine Distance is Admissible:**
  The straight-line (great-circle) distance is the shortest possible physical distance between two coordinates on the Earth sphere. Because physical roads bend around obstacles and city blocks, actual road distance $g(u, v) \ge d_{\text{haversine}}$ always. Therefore, $h(n) \le h^*(n)$ (never overestimates), guaranteeing that A* search is admissible and finds an optimal path.
- **Directional Continuity:**
  Every OpenStreetMap edge geometry is strictly oriented from the source node to the target node, preventing zigzagging or doubling back at intersections.
- **Academic Integrity Disclaimer:**
  All risk zone statistics and incident numbers are synthetic demonstration data for academic evaluation in Jalandhar. OpenStreetMap coverage can be incomplete, and calculated routes are an academic demonstration of A* graph search, not an official guarantee of pedestrian safety.

---

## 📁 Repository Structure

```text
safesphere/
├── backend/
│   ├── app.py                  # Flask REST API endpoints
│   └── requirements.txt        # Python package dependencies
├── data/
│   ├── synthetic_risk_zones.csv # Academic demonstration risk data
│   ├── validate_data.py        # CSV validation test suite
│   └── jalandhar_walk_graph.json # Cached OSM walkable road graph
├── frontend/                   # React + Vite + Leaflet web interface
│   ├── src/components/
│   │   ├── MapView.jsx         # Interactive Leaflet map & route polyline
│   │   ├── RoutePlannerCard.jsx# A* router controls & distance comparison
│   │   ├── RiskPredictorCard.jsx # Decision Tree prediction panel
│   │   ├── Legend.jsx          # Map color legend & disclaimers
│   │   └── Header.jsx          # Top navigation bar
│   └── package.json
├── ml/
│   ├── train_classifier.py     # Decision Tree training script
│   ├── risk_model.joblib       # Trained ML model weights
│   └── model_meta.json         # Model accuracy, classes, and rules
├── routing/
│   ├── astar.py                # Pure Python A* search & snapping logic
│   ├── build_graph.py          # OSMnx OpenStreetMap graph builder
│   └── test_astar.py           # 6-case A* unit test suite
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```
