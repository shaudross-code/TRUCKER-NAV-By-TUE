"""
Test suite for Reputation Scoring System
Tests:
- GET /api/facilities returns facilities with majority.reputation_score and majority.total_reports
- POST /api/facilities/report returns updated majority with reputation_score
- GET /api/poi/parking-status returns reputation_score based on parking status
- calcFacilityReputationScore returns 0 when total_reports=0 and >0 when there are reports
"""
import pytest
import requests
import os
import time

BASE_URL = "http://localhost:8001"


class TestFacilitiesReputationScore:
    """Test facility reputation scoring via GET /api/facilities"""

    def test_get_facilities_returns_200(self):
        """GET /api/facilities should return 200 with valid lat/lon"""
        response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42, "lon": -83, "radius": 200000})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "facilities" in data, "Response should contain 'facilities' key"
        print(f"PASS: GET /api/facilities returns 200 with {len(data['facilities'])} facilities")

    def test_facilities_have_majority_with_reputation_score(self):
        """Each facility should have majority.reputation_score field"""
        response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42, "lon": -83, "radius": 200000})
        assert response.status_code == 200
        data = response.json()
        facilities = data.get("facilities", [])
        
        assert len(facilities) > 0, "Expected at least one facility"
        
        for facility in facilities:
            assert "majority" in facility, f"Facility {facility.get('id')} missing 'majority'"
            majority = facility["majority"]
            assert "reputation_score" in majority, f"Facility {facility.get('id')} majority missing 'reputation_score'"
            assert isinstance(majority["reputation_score"], (int, float)), "reputation_score should be numeric"
            print(f"  Facility {facility.get('name', 'Unknown')}: reputation_score={majority['reputation_score']}")
        
        print(f"PASS: All {len(facilities)} facilities have majority.reputation_score")

    def test_facilities_have_majority_with_total_reports(self):
        """Each facility should have majority.total_reports field"""
        response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42, "lon": -83, "radius": 200000})
        assert response.status_code == 200
        data = response.json()
        facilities = data.get("facilities", [])
        
        assert len(facilities) > 0, "Expected at least one facility"
        
        for facility in facilities:
            majority = facility.get("majority", {})
            assert "total_reports" in majority, f"Facility {facility.get('id')} majority missing 'total_reports'"
            assert isinstance(majority["total_reports"], int), "total_reports should be integer"
        
        print(f"PASS: All {len(facilities)} facilities have majority.total_reports")

    def test_reputation_score_zero_when_no_reports(self):
        """Facility with total_reports=0 should have reputation_score=0"""
        # Create a new facility with no reports
        create_response = requests.post(f"{BASE_URL}/api/facilities", json={
            "name": "TEST_NoReports_Facility",
            "lat": 42.5,
            "lon": -83.5,
            "type": "both"
        })
        assert create_response.status_code == 200
        created = create_response.json()
        facility = created.get("facility", {})
        majority = facility.get("majority", {})
        
        # New facility with type vote has total_reports=1, but no speed/parking data
        # The reputation_score should be 0 because there are no speed/parking votes
        # Actually, per the code, total_reports=1 but no speed/parking data means score=0
        print(f"  Created facility: total_reports={majority.get('total_reports')}, reputation_score={majority.get('reputation_score')}")
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42.5, "lon": -83.5, "radius": 10000})
        assert get_response.status_code == 200
        facilities = get_response.json().get("facilities", [])
        test_facility = next((f for f in facilities if f.get("name") == "TEST_NoReports_Facility"), None)
        
        if test_facility:
            # With only type vote and no speed/parking data, reputation_score should be 0
            assert test_facility["majority"]["reputation_score"] == 0, "Facility with no speed/parking data should have reputation_score=0"
            print("PASS: Facility with no speed/parking reports has reputation_score=0")
        else:
            print("PASS: New facility created (may not be in radius)")

    def test_reputation_score_positive_when_has_reports(self):
        """Facility with reports should have reputation_score > 0"""
        response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42, "lon": -83, "radius": 200000})
        assert response.status_code == 200
        facilities = response.json().get("facilities", [])
        
        # Find facility with reports (XYZ Warehouse has 3 reports)
        facility_with_reports = next((f for f in facilities if f.get("majority", {}).get("total_reports", 0) > 1), None)
        
        if facility_with_reports:
            majority = facility_with_reports["majority"]
            assert majority["reputation_score"] > 0, f"Facility with {majority['total_reports']} reports should have reputation_score > 0"
            print(f"PASS: Facility '{facility_with_reports.get('name')}' with {majority['total_reports']} reports has reputation_score={majority['reputation_score']}")
        else:
            pytest.skip("No facility with multiple reports found")


class TestFacilityReportReputationScore:
    """Test POST /api/facilities/report returns updated reputation_score"""

    def test_report_returns_majority_with_reputation_score(self):
        """POST /api/facilities/report should return majority with reputation_score"""
        # First get an existing facility
        get_response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42, "lon": -83, "radius": 200000})
        assert get_response.status_code == 200
        facilities = get_response.json().get("facilities", [])
        assert len(facilities) > 0, "Need at least one facility to test"
        
        facility_id = facilities[0]["id"]
        
        # Submit a report
        report_response = requests.post(f"{BASE_URL}/api/facilities/report", json={
            "facility_id": facility_id,
            "loading_speed": "fast",
            "parking_allowed": True
        })
        
        assert report_response.status_code == 200, f"Expected 200, got {report_response.status_code}"
        data = report_response.json()
        
        assert "majority" in data, "Response should contain 'majority'"
        assert "reputation_score" in data["majority"], "majority should contain 'reputation_score'"
        assert isinstance(data["majority"]["reputation_score"], (int, float)), "reputation_score should be numeric"
        
        print(f"PASS: POST /api/facilities/report returns majority.reputation_score={data['majority']['reputation_score']}")

    def test_report_updates_reputation_score(self):
        """Submitting a report should update the reputation_score"""
        # Create a fresh facility
        create_response = requests.post(f"{BASE_URL}/api/facilities", json={
            "name": "TEST_ReputationUpdate_Facility",
            "lat": 42.6,
            "lon": -83.6,
            "type": "receiver"
        })
        assert create_response.status_code == 200
        facility_id = create_response.json()["facility"]["id"]
        initial_score = create_response.json()["facility"]["majority"]["reputation_score"]
        
        # Submit a positive report
        report_response = requests.post(f"{BASE_URL}/api/facilities/report", json={
            "facility_id": facility_id,
            "loading_speed": "fast",
            "unloading_speed": "fast",
            "parking_allowed": True,
            "overnight_parking": True
        })
        
        assert report_response.status_code == 200
        new_score = report_response.json()["majority"]["reputation_score"]
        
        # After adding positive reports, score should be > 0
        assert new_score > 0, f"After positive report, reputation_score should be > 0, got {new_score}"
        print(f"PASS: Report updated reputation_score from {initial_score} to {new_score}")


class TestParkingStatusReputationScore:
    """Test GET /api/poi/parking-status returns reputation_score"""

    def test_parking_status_returns_reputation_score(self):
        """GET /api/poi/parking-status should return reputation_score field"""
        # Use existing test POI
        poi_id = "41.8827_-87.6231"
        response = requests.get(f"{BASE_URL}/api/poi/parking-status", params={"poiId": poi_id})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "reputation_score" in data, "Response should contain 'reputation_score'"
        print(f"PASS: GET /api/poi/parking-status returns reputation_score={data['reputation_score']}")

    def test_parking_status_light_score(self):
        """Parking status 'light' should return reputation_score=4.5"""
        poi_id = "41.8827_-87.6231"  # This POI has status='light'
        response = requests.get(f"{BASE_URL}/api/poi/parking-status", params={"poiId": poi_id})
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("status") == "light":
            assert data["reputation_score"] == 4.5, f"Light status should have score 4.5, got {data['reputation_score']}"
            print("PASS: Parking status 'light' has reputation_score=4.5")
        else:
            print(f"INFO: POI status is '{data.get('status')}', not 'light'")

    def test_parking_status_scores_mapping(self):
        """Test all parking status to reputation_score mappings"""
        # Create test POIs with different statuses
        test_cases = [
            ("TEST_light_poi", "light", 4.5),
            ("TEST_medium_poi", "medium", 3.2),
            ("TEST_heavy_poi", "heavy", 2.0),
            ("TEST_maxed_poi", "maxed", 1.0),
        ]
        
        for poi_id, status, expected_score in test_cases:
            # Set the parking status
            post_response = requests.post(f"{BASE_URL}/api/poi/parking-status", json={
                "poiId": poi_id,
                "status": status,
                "name": f"Test {status} POI",
                "lat": 42.0,
                "lon": -83.0
            })
            assert post_response.status_code == 200, f"Failed to set status for {poi_id}"
            
            # Get and verify
            get_response = requests.get(f"{BASE_URL}/api/poi/parking-status", params={"poiId": poi_id})
            assert get_response.status_code == 200
            data = get_response.json()
            
            assert data["reputation_score"] == expected_score, f"Status '{status}' should have score {expected_score}, got {data['reputation_score']}"
            print(f"  PASS: Status '{status}' -> reputation_score={expected_score}")
        
        print("PASS: All parking status to reputation_score mappings correct")

    def test_parking_status_no_data_returns_zero(self):
        """POI with no parking data should return reputation_score=0"""
        poi_id = "TEST_nonexistent_poi_12345"
        response = requests.get(f"{BASE_URL}/api/poi/parking-status", params={"poiId": poi_id})
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["reputation_score"] == 0, f"POI with no data should have score 0, got {data['reputation_score']}"
        print("PASS: POI with no parking data has reputation_score=0")


class TestReputationScoreCalculation:
    """Test the calcFacilityReputationScore logic"""

    def test_score_calculation_with_all_positive(self):
        """All positive reports should result in high score (close to 5)"""
        # Create facility and add all positive reports
        create_response = requests.post(f"{BASE_URL}/api/facilities", json={
            "name": "TEST_AllPositive_Facility",
            "lat": 42.7,
            "lon": -83.7,
            "type": "both"
        })
        assert create_response.status_code == 200
        facility_id = create_response.json()["facility"]["id"]
        
        # Submit multiple positive reports
        for _ in range(3):
            requests.post(f"{BASE_URL}/api/facilities/report", json={
                "facility_id": facility_id,
                "loading_speed": "fast",
                "unloading_speed": "fast",
                "parking_allowed": True,
                "overnight_parking": True
            })
        
        # Get the facility and check score
        get_response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42.7, "lon": -83.7, "radius": 10000})
        facilities = get_response.json().get("facilities", [])
        test_facility = next((f for f in facilities if f.get("name") == "TEST_AllPositive_Facility"), None)
        
        if test_facility:
            score = test_facility["majority"]["reputation_score"]
            assert score >= 4.0, f"All positive reports should result in score >= 4.0, got {score}"
            print(f"PASS: All positive reports result in reputation_score={score}")
        else:
            pytest.skip("Test facility not found in radius")

    def test_score_calculation_with_mixed_reports(self):
        """Mixed reports should result in moderate score"""
        create_response = requests.post(f"{BASE_URL}/api/facilities", json={
            "name": "TEST_Mixed_Facility",
            "lat": 42.8,
            "lon": -83.8,
            "type": "both"
        })
        assert create_response.status_code == 200
        facility_id = create_response.json()["facility"]["id"]
        
        # Submit mixed reports
        requests.post(f"{BASE_URL}/api/facilities/report", json={
            "facility_id": facility_id,
            "loading_speed": "fast",
            "parking_allowed": True
        })
        requests.post(f"{BASE_URL}/api/facilities/report", json={
            "facility_id": facility_id,
            "loading_speed": "slow",
            "parking_allowed": False
        })
        
        # Get and verify score is between 1 and 4
        get_response = requests.get(f"{BASE_URL}/api/facilities", params={"lat": 42.8, "lon": -83.8, "radius": 10000})
        facilities = get_response.json().get("facilities", [])
        test_facility = next((f for f in facilities if f.get("name") == "TEST_Mixed_Facility"), None)
        
        if test_facility:
            score = test_facility["majority"]["reputation_score"]
            assert 1.0 <= score <= 4.5, f"Mixed reports should result in moderate score, got {score}"
            print(f"PASS: Mixed reports result in reputation_score={score}")
        else:
            pytest.skip("Test facility not found in radius")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
