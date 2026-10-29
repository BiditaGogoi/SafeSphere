"""
Data Quality Validation Script for SafeRoute
Checks synthetic dataset for completeness, duplicate keys, and valid ranges.
No external dependencies required (uses standard library 'csv').
"""

import csv
import sys
import os

VALID_RISK_LABELS = {"lower", "moderate", "higher"}
REQUIRED_FIELDS = [
    "area_id",
    "area_name",
    "lat",
    "lng",
    "radius_meters",
    "time_period",
    "incident_count",
    "lighting_score",
    "crowd_density",
    "risk_label",
    "notes",
]

# Coordinate bounding box for Jalandhar region
LAT_RANGE = (31.10, 31.50)
LNG_RANGE = (75.40, 75.80)


def validate_dataset(filepath):
    print(f"[DATA CHECK] Validating file: {filepath}")
    errors = []
    warnings = []

    if not os.path.exists(filepath):
        return False, [f"File not found: {filepath}"]

    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        
        # 1. Check header fields
        for field in REQUIRED_FIELDS:
            if field not in reader.fieldnames:
                errors.append(f"Missing required column in header: '{field}'")
        
        if errors:
            return False, errors

        seen_ids = set()
        seen_coords = set()
        row_count = 0

        for row_num, row in enumerate(reader, start=2):
            row_count += 1
            area_id = row.get("area_id", "").strip()
            area_name = row.get("area_name", "").strip()
            risk_label = row.get("risk_label", "").strip().lower()
            incident_count_str = row.get("incident_count", "").strip()
            lighting_str = row.get("lighting_score", "").strip()
            crowd_str = row.get("crowd_density", "").strip()
            lat_str = row.get("lat", "").strip()
            lng_str = row.get("lng", "").strip()

            # Check 1: Missing / empty fields
            for field in REQUIRED_FIELDS:
                if not row.get(field, "").strip():
                    errors.append(f"Row {row_num}: Field '{field}' is empty.")

            # Check 2: Duplicate Area IDs
            if area_id in seen_ids:
                errors.append(f"Row {row_num}: Duplicate area_id '{area_id}'.")
            seen_ids.add(area_id)

            # Check 3: Duplicate Coordinate Pairs
            coord_pair = (lat_str, lng_str)
            if coord_pair in seen_coords:
                warnings.append(f"Row {row_num}: Duplicate coordinates {coord_pair}.")
            seen_coords.add(coord_pair)

            # Check 4: Valid Incident Count (non-negative integer)
            try:
                count = int(incident_count_str)
                if count < 0:
                    errors.append(f"Row {row_num} ({area_id}): Negative incident count '{count}'.")
            except ValueError:
                errors.append(f"Row {row_num} ({area_id}): Invalid non-integer incident count '{incident_count_str}'.")

            # Check 5: Valid Lighting Score & Crowd Density (1 to 10 integer)
            try:
                light = int(lighting_str)
                if not (1 <= light <= 10):
                    errors.append(f"Row {row_num} ({area_id}): lighting_score '{light}' must be between 1 and 10.")
            except ValueError:
                errors.append(f"Row {row_num} ({area_id}): lighting_score '{lighting_str}' is not an integer.")

            try:
                crowd = int(crowd_str)
                if not (1 <= crowd <= 10):
                    errors.append(f"Row {row_num} ({area_id}): crowd_density '{crowd}' must be between 1 and 10.")
            except ValueError:
                errors.append(f"Row {row_num} ({area_id}): crowd_density '{crowd_str}' is not an integer.")

            # Check 6: Valid Risk Labels ('lower', 'moderate', 'higher')
            if risk_label not in VALID_RISK_LABELS:
                errors.append(
                    f"Row {row_num} ({area_id}): Invalid risk label '{risk_label}'. "
                    f"Must be one of: {sorted(list(VALID_RISK_LABELS))}"
                )

            # Check 7: Jalandhar Geographic Bounding Box
            try:
                lat = float(lat_str)
                lng = float(lng_str)
                if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
                    errors.append(f"Row {row_num} ({area_id}): Latitude {lat} outside Jalandhar bounds {LAT_RANGE}.")
                if not (LNG_RANGE[0] <= lng <= LNG_RANGE[1]):
                    errors.append(f"Row {row_num} ({area_id}): Longitude {lng} outside Jalandhar bounds {LNG_RANGE}.")
            except ValueError:
                errors.append(f"Row {row_num} ({area_id}): Lat/Lng must be valid floating point numbers.")

    # Summary
    if errors:
        print(f"[FAIL] Data quality checks failed with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return False, errors
    else:
        print(f"[PASS] All checks passed successfully for {row_count} records.")
        if warnings:
            for warn in warnings:
                print(f"  [Warning] {warn}")
        return True, []


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    default_csv = os.path.join(base_dir, "synthetic_risk_zones.csv")
    csv_path = sys.argv[1] if len(sys.argv) > 1 else default_csv

    passed, _ = validate_dataset(csv_path)
    sys.exit(0 if passed else 1)
