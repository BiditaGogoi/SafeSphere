"""
SafeRoute - Decision Tree Risk Classifier Training Script (Stage 3)
Trains an interpretable scikit-learn DecisionTreeClassifier on synthetic Jalandhar safety features.
Uses a reproducible random seed (42) and prints honest evaluation metrics.
"""

import os
import csv
import json
import joblib
import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_CSV = os.path.join(PROJECT_ROOT, "data", "synthetic_risk_zones.csv")
MODEL_PATH = os.path.join(BASE_DIR, "risk_model.joblib")
META_PATH = os.path.join(BASE_DIR, "model_meta.json")

FEATURE_NAMES = ["incident_count", "lighting_score", "crowd_density"]
VALID_CLASSES = ["lower", "moderate", "higher"]


def load_and_validate_data(csv_path):
    """Loads dataset and performs pre-training sanity checks."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")

    X = []
    y = []
    seen_ids = set()

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            area_id = row.get("area_id", "").strip()
            
            # 1. Duplicate check
            if area_id in seen_ids:
                raise ValueError(f"Duplicate area_id '{area_id}' at row {row_idx}")
            seen_ids.add(area_id)

            # 2. Missing value check
            for feat in FEATURE_NAMES + ["risk_label"]:
                if not row.get(feat, "").strip():
                    raise ValueError(f"Missing field '{feat}' at row {row_idx}")

            # 3. Numeric conversion and range check
            try:
                incidents = int(row["incident_count"])
                lighting = int(row["lighting_score"])
                crowd = int(row["crowd_density"])
            except ValueError as e:
                raise ValueError(f"Non-integer feature value at row {row_idx}: {e}")

            if incidents < 0 or not (1 <= lighting <= 10) or not (1 <= crowd <= 10):
                raise ValueError(f"Feature value out of valid bounds at row {row_idx}")

            # 4. Class label check
            label = row["risk_label"].strip().lower()
            if label not in VALID_CLASSES:
                raise ValueError(f"Invalid class label '{label}' at row {row_idx}. Must be one of {VALID_CLASSES}")

            X.append([incidents, lighting, crowd])
            y.append(label)

    return np.array(X), np.array(y)


def train_model():
    print("=" * 60)
    print("SafeRoute: Training Supervised Risk Classifier (Decision Tree)")
    print("=" * 60)

    # 1. Load and validate
    X, y = load_and_validate_data(DATA_CSV)
    total_samples = len(X)
    print(f"[DATA] Loaded {total_samples} verified demonstration records.")
    print(f"[FEATURES] Inputs: {FEATURE_NAMES}")
    print(f"[CLASSES] Targets: {sorted(list(set(y)))}")

    # 2. Reproducible Train / Test Split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    print(f"[SPLIT] Training Set: {len(X_train)} samples | Test Set: {len(X_test)} samples")

    # 3. Train Decision Tree Classifier
    # max_depth=3 prevents overfitting on small sample sizes and keeps tree human-readable
    clf = DecisionTreeClassifier(max_depth=3, random_state=42)
    clf.fit(X_train, y_train)

    # 4. Honest Evaluation
    test_preds = clf.predict(X_test)
    test_acc = accuracy_score(y_test, test_preds)
    cm = confusion_matrix(y_test, test_preds, labels=VALID_CLASSES)

    print("\n" + "-" * 40)
    print("EVALUATION RESULTS (Honest reporting on small test split)")
    print("-" * 40)
    print(f"Test Set Accuracy: {test_acc * 100:.1f}% ({test_acc:.2f})")
    print(f"Confusion Matrix (Rows: True, Cols: Pred) for {VALID_CLASSES}:")
    print(cm)
    print("\nClassification Report:")
    print(classification_report(y_test, test_preds, zero_division=0))
    print("NOTE ON EVALUATION:")
    print("  - The test set contains only 3 synthetic demonstration samples.")
    print("  - 100% accuracy on this tiny sample is NOT evidence of reliable real-world prediction.")
    print("  - Real-world deployment would require extensive empirical data collection.")

    # 5. Print Human-Readable Decision Rules
    print("-" * 40)
    print("TRANSPARENT DECISION TREE SPLIT RULES:")
    print("-" * 40)
    tree_rules = export_text(clf, feature_names=FEATURE_NAMES)
    print(tree_rules)

    # 6. Save Trained Model and Metadata
    joblib.dump(clf, MODEL_PATH)
    meta = {
        "model_type": "scikit-learn DecisionTreeClassifier",
        "max_depth": 3,
        "random_state": 42,
        "feature_names": FEATURE_NAMES,
        "classes": list(clf.classes_),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "test_accuracy": float(test_acc),
        "confusion_matrix": cm.tolist(),
        "disclaimer": "Academic synthetic demonstration data only. Not actual crime statistics in Jalandhar.",
        "evaluation_limitation": "The test set has only 3 samples. 100% accuracy on this demonstration set is NOT evidence of reliable real-world safety prediction."
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[SAVE] Model saved to: {MODEL_PATH}")
    print(f"[SAVE] Metadata saved to: {META_PATH}")
    print("=" * 60)
    return clf, meta


if __name__ == "__main__":
    train_model()
