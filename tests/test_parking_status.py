"""
Tests for crowd-sourced parking status API endpoints:
  GET  /api/poi/parking-status?poiId=...
  POST /api/poi/parking-status
"""
import pytest
import requests

BASE_URL = "http://localhost:8001"

# ── GET /api/poi/parking-status ──────────────────────────────────────────────

class TestGetParkingStatus:
    """GET parking status endpoint tests"""

    def test_get_existing_poi_returns_correct_structure(self):
        """Known POI in seed data returns status, updatedAt, updateCount"""
        r = requests.get(f"{BASE_URL}/api/poi/parking-status?poiId=41.8827_-87.6231")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "updatedAt" in data
        assert "updateCount" in data
        assert isinstance(data["updateCount"], int)
        print("PASS: get existing POI - correct structure")

    def test_get_existing_poi_returns_valid_status_value(self):
        """Existing POI status is one of the valid enum values"""
        r = requests.get(f"{BASE_URL}/api/poi/parking-status?poiId=41.8827_-87.6231")
        assert r.status_code == 200
        data = r.json()
        valid = ['light', 'medium', 'heavy', 'maxed', None]
        assert data["status"] in valid
        print(f"PASS: status value is valid: {data['status']}")

    def test_get_second_seed_poi_returns_data(self):
        """Second seed POI (maxed status) returns correct data"""
        r = requests.get(f"{BASE_URL}/api/poi/parking-status?poiId=33.4484_-112.0740")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "maxed"
        assert data["updateCount"] >= 4
        print(f"PASS: second seed POI returned status={data['status']}, updateCount={data['updateCount']}")

    def test_get_unknown_poi_returns_null_status(self):
        """Unknown POI returns null status and updateCount=0"""
        r = requests.get(f"{BASE_URL}/api/poi/parking-status?poiId=99.9999_-99.9999")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] is None
        assert data["updateCount"] == 0
        print("PASS: unknown POI returns null status and count=0")

    def test_get_missing_poiId_returns_400(self):
        """GET without poiId query param should return 400"""
        r = requests.get(f"{BASE_URL}/api/poi/parking-status")
        assert r.status_code == 400
        data = r.json()
        assert "error" in data
        print(f"PASS: missing poiId returns 400: {data['error']}")


# ── POST /api/poi/parking-status ─────────────────────────────────────────────

class TestPostParkingStatus:
    """POST parking status endpoint tests"""

    def test_post_valid_light_status(self):
        """POST with valid 'light' status returns success"""
        payload = {"poiId": "TEST_10.0000_20.0000", "status": "light", "name": "Test POI", "lat": 10.0, "lon": 20.0}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["status"] == "light"
        assert isinstance(data["updateCount"], int) and data["updateCount"] >= 1
        print(f"PASS: POST light status - success, updateCount={data['updateCount']}")

    def test_post_valid_medium_status(self):
        """POST with valid 'medium' status returns success"""
        payload = {"poiId": "TEST_10.0001_20.0001", "status": "medium", "name": "Test POI 2", "lat": 10.0001, "lon": 20.0001}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["status"] == "medium"
        print("PASS: POST medium status")

    def test_post_valid_heavy_status(self):
        """POST with valid 'heavy' status returns success"""
        payload = {"poiId": "TEST_10.0002_20.0002", "status": "heavy", "name": "Test POI 3", "lat": 10.0002, "lon": 20.0002}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["status"] == "heavy"
        print("PASS: POST heavy status")

    def test_post_valid_maxed_status(self):
        """POST with valid 'maxed' status returns success"""
        payload = {"poiId": "TEST_10.0003_20.0003", "status": "maxed", "name": "Test POI 4", "lat": 10.0003, "lon": 20.0003}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["status"] == "maxed"
        print("PASS: POST maxed status")

    def test_post_persists_to_get(self):
        """POST then GET to verify data persisted in file store"""
        poi_id = "TEST_50.0000_60.0000"
        # POST new status
        post_r = requests.post(f"{BASE_URL}/api/poi/parking-status", json={
            "poiId": poi_id, "status": "medium", "name": "Persist Test", "lat": 50.0, "lon": 60.0
        })
        assert post_r.status_code == 200
        assert post_r.json()["success"] is True

        # GET to verify persistence
        get_r = requests.get(f"{BASE_URL}/api/poi/parking-status?poiId={poi_id}")
        assert get_r.status_code == 200
        data = get_r.json()
        assert data["status"] == "medium"
        assert data["updateCount"] >= 1
        assert data["updatedAt"] is not None
        print(f"PASS: persisted data verified - status={data['status']}, count={data['updateCount']}")

    def test_post_increments_update_count(self):
        """Multiple POST calls increment updateCount"""
        poi_id = "TEST_70.0000_80.0000"
        # First POST
        r1 = requests.post(f"{BASE_URL}/api/poi/parking-status", json={
            "poiId": poi_id, "status": "light", "name": "Count Test", "lat": 70.0, "lon": 80.0
        })
        count1 = r1.json()["updateCount"]

        # Second POST
        r2 = requests.post(f"{BASE_URL}/api/poi/parking-status", json={
            "poiId": poi_id, "status": "heavy", "name": "Count Test", "lat": 70.0, "lon": 80.0
        })
        count2 = r2.json()["updateCount"]

        assert count2 == count1 + 1
        print(f"PASS: update count incremented from {count1} to {count2}")

    def test_post_invalid_status_returns_400(self):
        """POST with invalid status value returns 400"""
        payload = {"poiId": "TEST_11.0000_22.0000", "status": "invalid_status"}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 400
        data = r.json()
        assert "error" in data
        print(f"PASS: invalid status returns 400: {data['error']}")

    def test_post_missing_poiId_returns_400(self):
        """POST without poiId returns 400"""
        payload = {"status": "light", "name": "Test"}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 400
        data = r.json()
        assert "error" in data
        print(f"PASS: missing poiId returns 400: {data['error']}")

    def test_post_missing_status_returns_400(self):
        """POST without status returns 400"""
        payload = {"poiId": "TEST_12.0000_23.0000", "name": "Test"}
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json=payload)
        assert r.status_code == 400
        data = r.json()
        assert "error" in data
        print(f"PASS: missing status returns 400: {data['error']}")

    def test_post_empty_body_returns_400(self):
        """POST with empty body returns 400"""
        r = requests.post(f"{BASE_URL}/api/poi/parking-status", json={})
        assert r.status_code == 400
        print("PASS: empty body returns 400")
