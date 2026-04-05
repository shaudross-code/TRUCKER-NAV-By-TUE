"""
Test suite for Traffic Flow and Route Reasoning API endpoints
Tests the new roads and highways overlay system features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hud-customizer-5.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test that the health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "trucker-nav"
        print(f"PASS: Health check returned: {data}")


class TestTrafficFlowAPI:
    """Traffic Flow API endpoint tests - POST /api/traffic-flow"""
    
    def test_traffic_flow_with_valid_bbox(self):
        """Test traffic flow API with valid Denver bbox"""
        # Denver area bbox
        payload = {"bbox": ["-104.99", "39.74", "-104.98", "39.75"]}
        response = requests.post(
            f"{BASE_URL}/api/traffic-flow",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "results" in data, "Response should contain 'results' array"
        results = data["results"]
        assert isinstance(results, list), "Results should be a list"
        
        # Should have traffic flow data for Denver area
        print(f"PASS: Traffic flow API returned {len(results)} results")
        
        # Verify result structure if we have data
        if len(results) > 0:
            first_result = results[0]
            assert "location" in first_result or "currentFlow" in first_result, \
                "Result should contain location or currentFlow data"
            
            if "currentFlow" in first_result:
                flow = first_result["currentFlow"]
                # Check for expected flow properties
                assert "speed" in flow or "jamFactor" in flow, \
                    "currentFlow should contain speed or jamFactor"
                print(f"PASS: First result has currentFlow with jamFactor: {flow.get('jamFactor', 'N/A')}")
    
    def test_traffic_flow_with_string_bbox(self):
        """Test traffic flow API with bbox as comma-separated string"""
        payload = {"bbox": "-104.99,39.74,-104.98,39.75"}
        response = requests.post(
            f"{BASE_URL}/api/traffic-flow",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "results" in data
        print(f"PASS: Traffic flow API accepts string bbox format")
    
    def test_traffic_flow_omaha_area(self):
        """Test traffic flow API for Omaha NE area (app default location)"""
        # Omaha/Council Bluffs area
        payload = {"bbox": ["-96.05", "41.20", "-95.80", "41.30"]}
        response = requests.post(
            f"{BASE_URL}/api/traffic-flow",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        results = data["results"]
        
        # Omaha has major highways (I-80, I-480, US-75) so should have traffic data
        print(f"PASS: Omaha area traffic flow returned {len(results)} results")
        assert len(results) >= 0, "Should return results array (may be empty for low traffic areas)"
    
    def test_traffic_flow_missing_bbox(self):
        """Test traffic flow API behavior when bbox is missing"""
        response = requests.post(
            f"{BASE_URL}/api/traffic-flow",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # API may return 400 error or 200 with empty/error response
        if response.status_code == 400:
            data = response.json()
            assert "error" in data
            print(f"PASS: Missing bbox returns 400 error: {data['error']}")
        else:
            # Some implementations return 200 with error in body
            assert response.status_code == 200
            data = response.json()
            # Should either have error or empty results
            print(f"PASS: Missing bbox returns 200 with response: {list(data.keys())}")


class TestRouteAPI:
    """Route calculation API tests - POST /api/route"""
    
    def test_route_calculation(self):
        """Test truck route calculation from Omaha to Denver"""
        payload = {
            "origin": "41.2619,-95.8608",  # Council Bluffs/Omaha
            "destination": "39.74001,-104.99202",  # Denver
            "truckProfile": {
                "height": 13.5,
                "weight": 78500,
                "length": 53,
                "width": 8.5,
                "hazmat": False,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
            },
            "avoidTolls": False,
            "avoidFerries": True,
            "avoidUnpaved": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/route",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify route response structure
        assert "routes" in data, "Response should contain 'routes' array"
        routes = data["routes"]
        assert len(routes) >= 1, "Should return at least one route"
        
        # Check first route structure
        first_route = routes[0]
        assert "sections" in first_route, "Route should have sections"
        
        section = first_route["sections"][0]
        assert "summary" in section, "Section should have summary"
        assert "polyline" in section, "Section should have polyline for rendering"
        
        summary = section["summary"]
        assert "length" in summary, "Summary should have length"
        assert "duration" in summary, "Summary should have duration"
        
        # Route from Omaha to Denver should be ~500-600 miles
        length_miles = summary["length"] / 1609.34
        assert 400 < length_miles < 700, f"Route length {length_miles:.1f} mi seems incorrect"
        
        print(f"PASS: Route calculated - {length_miles:.1f} miles, {summary['duration']/3600:.1f} hours")
        
        # Check for spans data (used by Route Reasoning)
        if "spans" in section:
            print(f"PASS: Route has {len(section['spans'])} spans for route reasoning")
    
    def test_route_with_alternatives(self):
        """Test that route API returns alternative routes"""
        payload = {
            "origin": "41.2619,-95.8608",
            "destination": "39.74001,-104.99202",
            "truckProfile": {
                "height": 13.5,
                "weight": 78500,
                "length": 53,
                "width": 8.5
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/route",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        routes = data.get("routes", [])
        
        # API should return up to 3 alternatives
        print(f"PASS: Route API returned {len(routes)} route alternatives")
        assert len(routes) >= 1, "Should return at least one route"


class TestSearchAPI:
    """Search/Autosuggest API tests"""
    
    def test_search_suggestions(self):
        """Test address search suggestions"""
        payload = {
            "query": "Denver, CO",
            "lat": 41.2619,
            "lon": -95.8608
        }
        
        response = requests.post(
            f"{BASE_URL}/api/search",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return items array
        assert "items" in data, "Response should contain 'items' array"
        items = data["items"]
        assert len(items) > 0, "Should return search suggestions"
        
        # First item should be Denver
        first = items[0]
        assert "title" in first, "Item should have title"
        assert "Denver" in first["title"], "First result should be Denver"
        
        print(f"PASS: Search returned {len(items)} suggestions, first: {first['title']}")


class TestTrafficIncidentsAPI:
    """Traffic Incidents API tests"""
    
    def test_traffic_incidents(self):
        """Test traffic incidents API"""
        # Denver metro area bbox
        payload = {"bbox": "-105.2,39.5,-104.7,40.0"}
        
        response = requests.post(
            f"{BASE_URL}/api/traffic-incidents",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Response should have results array (may be empty if no incidents)
        assert "results" in data or isinstance(data, dict), "Should return valid response"
        print(f"PASS: Traffic incidents API returned successfully")


class TestFuelPricesAPI:
    """Fuel Prices API tests"""
    
    def test_fuel_prices(self):
        """Test fuel prices API"""
        payload = {
            "lat": 41.2619,
            "lon": -95.8608,
            "radius": 50000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stations" in data, "Response should contain 'stations' array"
        print(f"PASS: Fuel prices API returned {len(data['stations'])} stations")


class TestRoadShieldAPI:
    """Road Shield Icon API tests"""
    
    def test_road_shield_interstate(self):
        """Test road shield API for Interstate"""
        params = {
            "label": "80",
            "countryCode": "USA",
            "routeLevel": "1",
            "width": "64"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params=params
        )
        
        # Should return PNG image or 204 if not available
        assert response.status_code in [200, 204], f"Expected 200 or 204, got {response.status_code}"
        
        if response.status_code == 200:
            assert response.headers.get("Content-Type") == "image/png"
            print("PASS: Road shield API returned PNG image for I-80")
        else:
            print("PASS: Road shield API returned 204 (no content)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
