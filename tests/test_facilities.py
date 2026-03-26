"""
Backend tests for TruckersNav Facility POI system
Tests: GET /api/facilities, POST /api/facilities, POST /api/facilities/report, GET /api/facilities/:id/hours
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:8001"

# Known test facility from previous testing
EXISTING_FACILITY_ID = "manual_1774551488838_g8f8x"


class TestGetFacilities:
    """GET /api/facilities — returns JSON with facilities array"""

    def test_get_facilities_returns_200(self):
        """Basic GET with valid lat/lon"""
        res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_facilities_response_structure(self):
        """Response must have 'facilities' array"""
        res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        assert res.status_code == 200
        data = res.json()
        assert "facilities" in data, f"Missing 'facilities' key: {data}"
        assert isinstance(data["facilities"], list), "facilities must be a list"

    def test_get_facilities_contains_existing_facility(self):
        """Should return the pre-existing test facility within radius"""
        res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        assert res.status_code == 200
        data = res.json()
        ids = [f["id"] for f in data["facilities"]]
        assert EXISTING_FACILITY_ID in ids, f"Expected {EXISTING_FACILITY_ID} in facilities. Got: {ids}"

    def test_get_facilities_facility_has_required_fields(self):
        """Each facility must have id, name, lat, lon, majority"""
        res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        data = res.json()
        for f in data["facilities"]:
            assert "id" in f, f"Missing 'id' in facility {f}"
            assert "name" in f, f"Missing 'name' in facility {f}"
            assert "lat" in f and isinstance(f["lat"], (int, float))
            assert "lon" in f and isinstance(f["lon"], (int, float))
            assert "majority" in f, f"Missing 'majority' key in facility {f}"
            assert "type" in f["majority"], f"Missing majority.type in facility {f}"

    def test_get_facilities_missing_lat_lon_returns_400(self):
        """Missing lat/lon should return 400"""
        res = requests.get(f"{BASE_URL}/api/facilities")
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"

    def test_get_facilities_no_results_outside_radius(self):
        """Facilities far away should not be returned"""
        # Use a location far from existing test data (e.g., Miami)
        res = requests.get(f"{BASE_URL}/api/facilities?lat=25.7&lon=-80.2&radius=1000")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["facilities"], list)
        # None of the Michigan facilities should be in Miami with 1km radius
        ids = [f["id"] for f in data["facilities"]]
        assert EXISTING_FACILITY_ID not in ids, "Facility should not appear within 1km of Miami"

    def test_get_facilities_has_seeding_flag(self):
        """Response should have 'seeding' boolean"""
        res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        data = res.json()
        assert "seeding" in data, f"Missing 'seeding' key: {data}"


class TestPostFacility:
    """POST /api/facilities — create a new manual facility"""

    def test_post_facility_creates_and_returns_facility(self):
        """Create a new facility and verify it's returned"""
        payload = {
            "name": "TEST_Distribution Center Alpha",
            "lat": 43.5,
            "lon": -84.5,
            "type": "receiver"
        }
        res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("success") is True
        assert "facility" in data
        fac = data["facility"]
        assert fac["name"] == payload["name"]
        assert fac["lat"] == payload["lat"]
        assert fac["lon"] == payload["lon"]
        assert "id" in fac
        assert fac["id"].startswith("manual_")
        return fac["id"]

    def test_post_facility_type_shipper(self):
        """Shipper type should set type_votes.shipper = 1"""
        payload = {"name": "TEST_Shipper Warehouse", "lat": 43.2, "lon": -84.2, "type": "shipper"}
        res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert res.status_code == 200
        fac = res.json()["facility"]
        assert fac["crowd_data"]["type_votes"]["shipper"] == 1
        assert fac["crowd_data"]["type_votes"]["receiver"] == 0
        assert fac["majority"]["type"] == "shipper"

    def test_post_facility_type_both(self):
        """Both type should set type_votes.both = 1"""
        payload = {"name": "TEST_Crossdock DC", "lat": 43.3, "lon": -84.3, "type": "both"}
        res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert res.status_code == 200
        fac = res.json()["facility"]
        assert fac["crowd_data"]["type_votes"]["both"] == 1
        assert fac["majority"]["type"] == "both"

    def test_post_facility_missing_name_returns_400(self):
        """Missing name should return 400"""
        payload = {"lat": 43.0, "lon": -84.0, "type": "receiver"}
        res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"

    def test_post_facility_missing_lat_returns_400(self):
        """Missing lat should return 400"""
        payload = {"name": "Test", "lon": -84.0, "type": "receiver"}
        res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"

    def test_post_facility_persisted_in_get(self):
        """After creating a facility, it should appear in GET results"""
        payload = {
            "name": "TEST_Persistence Check DC",
            "lat": 43.6,
            "lon": -84.6,
            "type": "shipper"
        }
        post_res = requests.post(f"{BASE_URL}/api/facilities", json=payload)
        assert post_res.status_code == 200
        facility_id = post_res.json()["facility"]["id"]

        # GET with same lat/lon
        get_res = requests.get(f"{BASE_URL}/api/facilities?lat=43.6&lon=-84.6&radius=80000")
        assert get_res.status_code == 200
        ids = [f["id"] for f in get_res.json()["facilities"]]
        assert facility_id in ids, f"Created facility {facility_id} not found in GET. Got: {ids}"


class TestPostFacilityReport:
    """POST /api/facilities/report — update majority vote"""

    def test_report_on_existing_facility(self):
        """Report on pre-existing facility updates majority"""
        payload = {
            "facility_id": EXISTING_FACILITY_ID,
            "type": "receiver",
            "loading_speed": "fast",
            "parking_allowed": True
        }
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("success") is True
        assert "majority" in data
        assert "total_reports" in data
        assert isinstance(data["total_reports"], int)
        assert data["total_reports"] > 0

    def test_report_updates_majority_type(self):
        """Report with type updates majority.type"""
        # First create a fresh facility so we know the state
        payload_create = {"name": "TEST_Report Type Check", "lat": 43.7, "lon": -84.7, "type": "shipper"}
        create_res = requests.post(f"{BASE_URL}/api/facilities", json=payload_create)
        assert create_res.status_code == 200
        fac_id = create_res.json()["facility"]["id"]

        # Submit report with type=receiver to change vote
        report_payload = {"facility_id": fac_id, "type": "receiver", "loading_speed": "fast"}
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=report_payload)
        assert res.status_code == 200
        data = res.json()
        assert "majority" in data
        # shipper=1 (from creation), receiver=1 (from report) → tie → first in sort wins
        assert data["majority"]["type"] in ["shipper", "receiver"]

    def test_report_increments_total_reports(self):
        """Total reports should increment"""
        # Get current total
        get_res = requests.get(f"{BASE_URL}/api/facilities?lat=43.0&lon=-84.0&radius=80000")
        existing = next((f for f in get_res.json()["facilities"] if f["id"] == EXISTING_FACILITY_ID), None)
        assert existing is not None
        prev_total = existing["crowd_data"]["total_reports"]

        # Submit report
        report_payload = {"facility_id": EXISTING_FACILITY_ID, "loading_speed": "slow"}
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=report_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["total_reports"] == prev_total + 1, f"Expected {prev_total + 1}, got {data['total_reports']}"

    def test_report_invalid_facility_id_returns_404(self):
        """Unknown facility_id should return 404"""
        payload = {"facility_id": "nonexistent_facility_xyz_999"}
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=payload)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"

    def test_report_missing_facility_id_returns_400(self):
        """Missing facility_id should return 400"""
        payload = {"loading_speed": "fast"}
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=payload)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"

    def test_report_open_days_and_hours(self):
        """Report with open_days, open_time, close_time persists in majority"""
        payload = {
            "facility_id": EXISTING_FACILITY_ID,
            "open_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "open_time": "06:00",
            "close_time": "18:00"
        }
        res = requests.post(f"{BASE_URL}/api/facilities/report", json=payload)
        assert res.status_code == 200
        data = res.json()
        majority = data["majority"]
        assert majority.get("open_time") == "06:00"
        assert majority.get("close_time") == "18:00"
        assert "Mon" in majority.get("open_days", [])


class TestGetFacilityHours:
    """GET /api/facilities/:id/hours — returns google_hours array"""

    def test_get_hours_existing_manual_facility(self):
        """Manual facility should return empty google_hours (no Google call)"""
        res = requests.get(f"{BASE_URL}/api/facilities/{EXISTING_FACILITY_ID}/hours")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "google_hours" in data, f"Missing google_hours: {data}"
        assert isinstance(data["google_hours"], list)

    def test_get_hours_nonexistent_facility_returns_404(self):
        """Unknown facility ID should return 404"""
        res = requests.get(f"{BASE_URL}/api/facilities/nonexistent_id_xyz/hours")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"

    def test_get_hours_response_structure(self):
        """Response has google_hours list (may be empty for manual)"""
        res = requests.get(f"{BASE_URL}/api/facilities/{EXISTING_FACILITY_ID}/hours")
        data = res.json()
        assert isinstance(data.get("google_hours"), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
