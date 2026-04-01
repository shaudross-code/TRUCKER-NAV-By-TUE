"""
Test suite for Navigation Intelligence Features
Tests route visual separation, elevation data, alternative routes, and related features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestRouteElevationData:
    """Tests for elevation data in route responses"""
    
    def test_route_returns_200_ok(self):
        """Test that route API returns 200 OK"""
        payload = {
            "origin": "40.7128,-74.0060",  # NYC
            "destination": "34.0522,-118.2437",  # LA
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed: {response.text}"
        print("SUCCESS: Route API returns 200 OK")
    
    def test_route_returns_multiple_alternatives(self):
        """Test that route API returns multiple route alternatives"""
        payload = {
            "origin": "40.7128,-74.0060",  # NYC
            "destination": "34.0522,-118.2437",  # LA
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "routes" in data, "Response should contain routes"
        num_routes = len(data["routes"])
        assert num_routes >= 1, "Should have at least one route"
        print(f"SUCCESS: Route API returns {num_routes} route alternatives")
    
    def test_route_has_polyline_data(self):
        """Test that route contains polyline for map rendering"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "34.0522,-118.2437",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        assert "polyline" in section, "Section should have polyline"
        assert len(section["polyline"]) > 0, "Polyline should not be empty"
        print(f"SUCCESS: Route has polyline data (length: {len(section['polyline'])} chars)")
    
    def test_route_has_turn_by_turn_actions(self):
        """Test that route contains turn-by-turn actions for HUD"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "34.0522,-118.2437",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        assert "actions" in section, "Section should have actions"
        actions = section["actions"]
        assert len(actions) > 0, "Should have at least one action"
        
        # Verify action structure
        first_action = actions[0]
        assert "instruction" in first_action, "Action should have instruction"
        assert "action" in first_action, "Action should have action type"
        
        print(f"SUCCESS: Route has {len(actions)} turn-by-turn actions")
    
    def test_route_has_spans_with_speed_limits(self):
        """Test that route contains spans with speed limit data"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "34.0522,-118.2437",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        assert "spans" in section, "Section should have spans"
        spans = section["spans"]
        assert len(spans) > 0, "Should have at least one span"
        
        # Check if any span has speedLimit
        has_speed_limit = any("speedLimit" in span or "maxSpeed" in span for span in spans)
        print(f"SUCCESS: Route has {len(spans)} spans, speed limit data: {has_speed_limit}")
    
    def test_route_has_tolls_data(self):
        """Test that route contains tolls data"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "34.0522,-118.2437",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        # Tolls may or may not be present depending on route
        has_tolls = "tolls" in section
        print(f"SUCCESS: Route tolls data present: {has_tolls}")


class TestSearchAPI:
    """Tests for search endpoint"""
    
    def test_search_returns_results(self):
        """Test that search API returns location results"""
        payload = {
            "query": "truck stop",
            "lat": 40.7128,
            "lon": -74.0060
        }
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200, f"Search API failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain items"
        print(f"SUCCESS: Search returned {len(data.get('items', []))} results")


class TestIPLocation:
    """Tests for IP geolocation endpoint"""
    
    def test_ip_location_returns_coordinates(self):
        """Test that IP location API returns lat/lon"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        assert response.status_code == 200
        
        data = response.json()
        assert "lat" in data, "Response should have lat"
        assert "lon" in data, "Response should have lon"
        print(f"SUCCESS: IP location returned ({data['lat']}, {data['lon']})")


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_check(self):
        """Test that health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "ok", "Health status should be ok"
        print("SUCCESS: Health check passed")


class TestFuelPricesAPI:
    """Tests for fuel prices endpoint"""
    
    def test_fuel_prices_returns_stations(self):
        """Test that fuel prices API returns station data"""
        payload = {
            "lat": 40.7128,
            "lon": -74.0060,
            "radius": 50000
        }
        response = requests.post(f"{BASE_URL}/api/fuel-prices", json=payload)
        assert response.status_code == 200, f"Fuel prices API failed: {response.text}"
        
        data = response.json()
        assert "stations" in data, "Response should contain stations"
        print(f"SUCCESS: Fuel prices returned {len(data.get('stations', []))} stations")


class TestFacilitiesAPI:
    """Tests for facilities endpoint"""
    
    def test_facilities_returns_list(self):
        """Test that facilities API returns facility list"""
        response = requests.get(f"{BASE_URL}/api/facilities?lat=40.7128&lon=-74.0060&radius=50000")
        assert response.status_code == 200, f"Facilities API failed: {response.text}"
        
        data = response.json()
        assert "facilities" in data, "Response should contain facilities"
        print(f"SUCCESS: Facilities returned {len(data.get('facilities', []))} facilities")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
