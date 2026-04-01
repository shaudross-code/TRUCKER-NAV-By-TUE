"""
Test suite for Trucking GPS Navigation API endpoints
Tests route calculation, search, and related features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_server_responds(self):
        """Test that server is running and responds"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print("SUCCESS: Server is running")


class TestRouteEndpoint:
    """Route calculation endpoint tests"""
    
    def test_route_with_truck_profile(self):
        """Test route calculation with full truck profile"""
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
                "trailerCount": 1,
                "hazmat": False,
                "hazmatClasses": [],
                "tunnelCategory": "NONE"
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed: {response.text}"
        
        data = response.json()
        assert "routes" in data, "Response should contain routes"
        assert len(data["routes"]) > 0, "Should have at least one route"
        
        route = data["routes"][0]
        assert "sections" in route, "Route should have sections"
        
        section = route["sections"][0]
        assert "actions" in section, "Section should have actions (turn-by-turn)"
        assert "summary" in section, "Section should have summary"
        
        # Verify actions have required fields for voice guidance
        actions = section["actions"]
        assert len(actions) > 0, "Should have at least one action"
        
        first_action = actions[0]
        assert "instruction" in first_action, "Action should have instruction"
        assert "action" in first_action, "Action should have action type"
        
        print(f"SUCCESS: Route calculated with {len(actions)} turn-by-turn actions")
        print(f"First instruction: {first_action['instruction'][:50]}...")
    
    def test_route_returns_polyline(self):
        """Test that route returns polyline for map display"""
        payload = {
            "origin": "41.2619,-95.8608",  # Council Bluffs
            "destination": "34.0522,-118.2437",  # LA
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
        print(f"SUCCESS: Route has polyline data")
    
    def test_route_returns_summary(self):
        """Test that route returns summary with distance and duration"""
        payload = {
            "origin": "41.2619,-95.8608",
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
        summary = section["summary"]
        
        assert "length" in summary, "Summary should have length"
        assert "duration" in summary, "Summary should have duration"
        assert summary["length"] > 0, "Length should be positive"
        assert summary["duration"] > 0, "Duration should be positive"
        
        print(f"SUCCESS: Route summary - {summary['length']/1609.34:.1f} miles, {summary['duration']/3600:.1f} hours")
    
    def test_route_returns_spans_with_functional_class(self):
        """Test that route returns spans with functionalClass for lane visualization"""
        payload = {
            "origin": "41.2619,-95.8608",
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
        
        # Check if any span has functionalClass
        has_functional_class = any("functionalClass" in span for span in spans)
        assert has_functional_class, "At least one span should have functionalClass"
        
        print(f"SUCCESS: Route has {len(spans)} spans with functionalClass data")
    
    def test_route_missing_origin(self):
        """Test route API returns error when origin is missing"""
        payload = {
            "destination": "34.0522,-118.2437",
            "truckProfile": {"height": 13.5, "weight": 80000, "length": 53, "width": 8.5}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400
        print("SUCCESS: API correctly rejects missing origin")
    
    def test_route_missing_destination(self):
        """Test route API returns error when destination is missing"""
        payload = {
            "origin": "40.7128,-74.0060",
            "truckProfile": {"height": 13.5, "weight": 80000, "length": 53, "width": 8.5}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400
        print("SUCCESS: API correctly rejects missing destination")


class TestSearchEndpoint:
    """Search endpoint tests"""
    
    def test_search_location(self):
        """Test location search (POST endpoint)"""
        payload = {
            "query": "Los Angeles",
            "lat": 41.2619,
            "lon": -95.8608
        }
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200, f"Search API failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain items"
        assert len(data["items"]) > 0, "Should have at least one result"
        
        first_result = data["items"][0]
        assert "title" in first_result, "Result should have title"
        
        print(f"SUCCESS: Search returned {len(data['items'])} results")
        print(f"First result: {first_result['title']}")


class TestIPLocationEndpoint:
    """IP geolocation endpoint tests"""
    
    def test_ip_location(self):
        """Test IP-based geolocation"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        assert response.status_code == 200
        
        data = response.json()
        assert "lat" in data, "Response should have lat"
        assert "lon" in data, "Response should have lon"
        
        print(f"SUCCESS: IP location returned ({data['lat']}, {data['lon']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
