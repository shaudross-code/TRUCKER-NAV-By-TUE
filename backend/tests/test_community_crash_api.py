"""
Backend API Tests for Community Reports and AI Crash Prediction
Tests the new features: Community Data Layer and AI Crash/Incident Detection
"""
import pytest
import requests
import os
import time

BASE_URL = "https://hud-customizer-5.preview.emergentagent.com"


class TestCommunityReportsAPI:
    """Tests for Community Reports API endpoints"""
    
    def test_get_community_reports(self):
        """GET /api/community/reports should return reports array"""
        response = requests.get(f"{BASE_URL}/api/community/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reports" in data, "Response should contain 'reports' key"
        assert isinstance(data["reports"], list), "Reports should be a list"
        
        # Should have seeded reports (4 according to context)
        assert len(data["reports"]) >= 4, f"Expected at least 4 seeded reports, got {len(data['reports'])}"
        print(f"✓ GET /api/community/reports returned {len(data['reports'])} reports")
        
    def test_community_report_structure(self):
        """Verify community report has required fields"""
        response = requests.get(f"{BASE_URL}/api/community/reports")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reports"]) > 0:
            report = data["reports"][0]
            required_fields = ["id", "category", "title", "description", "lat", "lon", 
                             "locationName", "userName", "upvotes", "createdAt"]
            for field in required_fields:
                assert field in report, f"Report missing required field: {field}"
            print(f"✓ Report structure verified with all required fields")
            
    def test_community_report_categories(self):
        """Verify seeded reports have valid categories"""
        response = requests.get(f"{BASE_URL}/api/community/reports")
        assert response.status_code == 200
        
        data = response.json()
        valid_categories = ["parking", "fuel_price", "weigh_station", "hazard", "road_condition"]
        
        for report in data["reports"]:
            assert report["category"] in valid_categories, f"Invalid category: {report['category']}"
        print(f"✓ All report categories are valid")
        
    def test_post_community_report_hazard(self):
        """POST /api/community/reports with hazard category"""
        payload = {
            "category": "hazard",
            "title": "Test Hazard Report",
            "description": "Testing hazard report creation",
            "locationName": "Test Location I-80",
            "lat": 41.5,
            "lon": -93.5,
            "userName": "TestUser"
        }
        
        response = requests.post(f"{BASE_URL}/api/community/reports", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["category"] == "hazard", "Category should be 'hazard'"
        assert data["title"] == "Test Hazard Report", "Title should match"
        assert "expiresAt" in data, "Hazard reports should have expiresAt"
        print(f"✓ POST /api/community/reports created hazard report with id: {data['id']}")
        return data["id"]
        
    def test_post_community_report_parking(self):
        """POST /api/community/reports with parking category"""
        payload = {
            "category": "parking",
            "title": "Test Parking Report",
            "description": "Spaces available at test location",
            "locationName": "I-80 Exit 50",
            "lat": 41.6,
            "lon": -93.6,
            "userName": "TestTrucker"
        }
        
        response = requests.post(f"{BASE_URL}/api/community/reports", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["category"] == "parking"
        assert data["title"] == "Test Parking Report"
        print(f"✓ POST /api/community/reports created parking report with id: {data['id']}")
        return data["id"]
        
    def test_post_community_report_missing_fields(self):
        """POST /api/community/reports without required fields should fail"""
        # Missing category
        response = requests.post(f"{BASE_URL}/api/community/reports", json={"title": "Test"})
        assert response.status_code == 400, f"Expected 400 for missing category, got {response.status_code}"
        
        # Missing title
        response = requests.post(f"{BASE_URL}/api/community/reports", json={"category": "hazard"})
        assert response.status_code == 400, f"Expected 400 for missing title, got {response.status_code}"
        print(f"✓ POST /api/community/reports correctly rejects invalid requests")
        
    def test_upvote_community_report(self):
        """POST /api/community/reports/:id/upvote should increment upvotes"""
        # First get existing reports
        response = requests.get(f"{BASE_URL}/api/community/reports")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["reports"]) > 0:
            report = data["reports"][0]
            report_id = report["id"]
            initial_upvotes = report["upvotes"]
            
            # Upvote the report
            upvote_response = requests.post(f"{BASE_URL}/api/community/reports/{report_id}/upvote")
            assert upvote_response.status_code == 200, f"Expected 200, got {upvote_response.status_code}"
            
            upvote_data = upvote_response.json()
            assert "upvotes" in upvote_data, "Response should contain 'upvotes'"
            assert upvote_data["upvotes"] == initial_upvotes + 1, f"Upvotes should increment from {initial_upvotes} to {initial_upvotes + 1}"
            print(f"✓ POST /api/community/reports/{report_id}/upvote incremented upvotes to {upvote_data['upvotes']}")
            
    def test_upvote_nonexistent_report(self):
        """POST /api/community/reports/:id/upvote for nonexistent report should return 404"""
        response = requests.post(f"{BASE_URL}/api/community/reports/nonexistent_id_12345/upvote")
        assert response.status_code == 404, f"Expected 404 for nonexistent report, got {response.status_code}"
        print(f"✓ POST /api/community/reports/nonexistent_id/upvote correctly returns 404")


class TestCrashPredictionAPI:
    """Tests for AI Crash/Incident Prediction API"""
    
    def test_crash_prediction_with_bbox(self):
        """POST /api/crash-prediction with bbox should return prediction"""
        payload = {
            "bbox": "-87.6,41.8,-87.5,41.9"  # Chicago area
        }
        
        response = requests.post(f"{BASE_URL}/api/crash-prediction", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "incidentCount" in data, "Response should contain 'incidentCount'"
        assert "incidents" in data, "Response should contain 'incidents'"
        assert "aiPrediction" in data, "Response should contain 'aiPrediction'"
        assert "analyzedAt" in data, "Response should contain 'analyzedAt'"
        
        # Verify aiPrediction structure
        ai = data["aiPrediction"]
        assert "riskScore" in ai, "aiPrediction should contain 'riskScore'"
        assert "warnings" in ai, "aiPrediction should contain 'warnings'"
        assert "recommendation" in ai, "aiPrediction should contain 'recommendation'"
        assert "estimatedDelay" in ai, "aiPrediction should contain 'estimatedDelay'"
        
        # Verify riskScore is valid
        assert isinstance(ai["riskScore"], (int, float)), "riskScore should be a number"
        assert 1 <= ai["riskScore"] <= 10, f"riskScore should be 1-10, got {ai['riskScore']}"
        
        print(f"✓ POST /api/crash-prediction returned {data['incidentCount']} incidents, riskScore: {ai['riskScore']}")
        
    def test_crash_prediction_with_route_coords(self):
        """POST /api/crash-prediction with routeCoords should return prediction"""
        payload = {
            "routeCoords": [
                [41.8781, -87.6298],  # Chicago
                [41.8500, -87.6500],
                [41.8200, -87.6800]
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/crash-prediction", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "incidentCount" in data
        assert "aiPrediction" in data
        print(f"✓ POST /api/crash-prediction with routeCoords returned successfully")
        
    def test_crash_prediction_missing_params(self):
        """POST /api/crash-prediction without params should return 400"""
        response = requests.post(f"{BASE_URL}/api/crash-prediction", json={})
        assert response.status_code == 400, f"Expected 400 for missing params, got {response.status_code}"
        
        data = response.json()
        assert "error" in data, "Error response should contain 'error' message"
        print(f"✓ POST /api/crash-prediction correctly returns 400 for missing params")
        
    def test_crash_prediction_incidents_structure(self):
        """Verify incident objects have required fields"""
        payload = {"bbox": "-87.6,41.8,-87.5,41.9"}
        
        response = requests.post(f"{BASE_URL}/api/crash-prediction", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["incidents"]) > 0:
            incident = data["incidents"][0]
            expected_fields = ["id", "type", "description", "severity"]
            for field in expected_fields:
                assert field in incident, f"Incident missing field: {field}"
            print(f"✓ Incident structure verified with required fields")
        else:
            print(f"✓ No incidents in area (route is clear)")


class TestHealthAndExistingAPIs:
    """Verify existing APIs still work"""
    
    def test_health_endpoint(self):
        """GET /health should return ok"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ GET /health returns ok")
        
    def test_parking_predict_api(self):
        """GET /api/poi/parking-predict should work"""
        response = requests.get(f"{BASE_URL}/api/poi/parking-predict?poiId=test_poi_123")
        assert response.status_code == 200
        data = response.json()
        assert "prediction" in data
        assert "fillPercent" in data
        print(f"✓ GET /api/poi/parking-predict works")
        
    def test_facility_ratings_api(self):
        """GET /api/facility-ratings should work"""
        response = requests.get(f"{BASE_URL}/api/facility-ratings?poiId=test_poi")
        assert response.status_code == 200
        data = response.json()
        assert "averageRating" in data
        print(f"✓ GET /api/facility-ratings works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
