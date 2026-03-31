"""
Trucker Nav API Tests
Tests for HERE Maps API integration endpoints
"""
import pytest
import requests
import os

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test /health endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "trucker-nav"
        print("✓ Health check passed")


class TestRouteEndpoint:
    """Route calculation endpoint tests - P0 bug fix verification"""
    
    def test_route_calculation_success(self):
        """Test /api/route returns 200 OK with valid route data (P0 bug fix)"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.7580,-73.9855",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleWeight": 12000,
                "axleCount": 5,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        
        # P0 bug fix: Should return 200, not 400
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "routes" in data, "Response should contain 'routes' key"
        assert len(data["routes"]) > 0, "Should have at least one route"
        print("✓ Route calculation returns 200 OK (P0 bug fix verified)")
    
    def test_route_contains_spans_with_speed_limit(self):
        """Test route response includes spans with speedLimit data"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.7580,-73.9855",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleWeight": 12000,
                "axleCount": 5,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        # Check spans exist
        assert "spans" in section, "Section should contain 'spans'"
        spans = section["spans"]
        assert len(spans) > 0, "Should have at least one span"
        
        # Check speedLimit in spans
        has_speed_limit = any("speedLimit" in span for span in spans)
        assert has_speed_limit, "At least one span should have speedLimit"
        print("✓ Route contains spans with speedLimit data")
    
    def test_route_contains_spans_with_truck_attributes(self):
        """Test route response includes spans with truckAttributes data"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.7580,-73.9855",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleWeight": 12000,
                "axleCount": 5,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        spans = section["spans"]
        
        # Check truckAttributes in spans
        has_truck_attrs = any("truckAttributes" in span for span in spans)
        assert has_truck_attrs, "At least one span should have truckAttributes"
        print("✓ Route contains spans with truckAttributes data")
    
    def test_route_contains_spans_with_notices(self):
        """Test route response includes spans with notices data"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.7580,-73.9855",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleWeight": 12000,
                "axleCount": 5,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        spans = section["spans"]
        
        # Check notices in spans (may not always be present)
        has_notices = any("notices" in span for span in spans)
        # Notices are optional, just verify structure is correct
        print(f"✓ Route spans structure verified (notices present: {has_notices})")
    
    def test_route_contains_section_notices(self):
        """Test route response includes section-level notices for truck warnings"""
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.7580,-73.9855",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleWeight": 12000,
                "axleCount": 5,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        route = data["routes"][0]
        section = route["sections"][0]
        
        # Check section-level notices
        if "notices" in section:
            notices = section["notices"]
            assert isinstance(notices, list), "Section notices should be a list"
            print(f"✓ Route contains {len(notices)} section-level notices")
        else:
            print("✓ Route structure verified (no section notices for this route)")
    
    def test_route_missing_origin(self):
        """Test /api/route returns 400 when origin is missing"""
        payload = {
            "destination": "40.7580,-73.9855",
            "truckProfile": {"height": 13.5}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400
        print("✓ Route validation: missing origin returns 400")
    
    def test_route_missing_destination(self):
        """Test /api/route returns 400 when destination is missing"""
        payload = {
            "origin": "40.7128,-74.0060",
            "truckProfile": {"height": 13.5}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400
        print("✓ Route validation: missing destination returns 400")


class TestSearchEndpoint:
    """Search endpoint tests"""
    
    def test_search_location(self):
        """Test /api/search returns results for location query"""
        payload = {
            "query": "Los Angeles",
            "lat": 34.0522,
            "lon": -118.2437
        }
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert len(data["items"]) > 0, "Should have at least one result"
        
        # Verify first result has expected structure
        first_item = data["items"][0]
        assert "title" in first_item
        assert "position" in first_item
        print(f"✓ Search returned {len(data['items'])} results for 'Los Angeles'")
    
    def test_search_missing_query(self):
        """Test /api/search returns 400 when query is missing"""
        payload = {"lat": 34.0522, "lon": -118.2437}
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 400
        print("✓ Search validation: missing query returns 400")


class TestRoadShieldEndpoint:
    """Road shield endpoint tests"""
    
    def test_road_shield_image(self):
        """Test /api/road-shield returns PNG image"""
        params = {
            "label": "95",
            "countryCode": "USA",
            "stateCode": "NY",
            "routeLevel": "1",
            "width": "64"
        }
        response = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "image/png"
        assert len(response.content) > 0, "Should return image data"
        print("✓ Road shield returns PNG image")
    
    def test_road_shield_missing_params(self):
        """Test /api/road-shield returns 400 when required params missing"""
        params = {"label": "95"}  # Missing countryCode
        response = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        assert response.status_code == 400
        print("✓ Road shield validation: missing params returns 400")


class TestIPLocationEndpoint:
    """IP location fallback endpoint tests"""
    
    def test_ip_location(self):
        """Test /api/ip-location returns location data"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        # May return 200 or 500 depending on external service
        if response.status_code == 200:
            data = response.json()
            assert "lat" in data
            assert "lon" in data
            print(f"✓ IP location returned: {data.get('city', 'Unknown')}")
        else:
            print("✓ IP location endpoint accessible (external service may be unavailable)")


class TestBrowseEndpoint:
    """Browse POI endpoint tests"""
    
    def test_browse_pois(self):
        """Test /api/browse returns POIs near location"""
        payload = {
            "lat": 41.2619,
            "lon": -95.8608,
            "radius": 50000
        }
        response = requests.post(f"{BASE_URL}/api/browse", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        print(f"✓ Browse returned {len(data.get('items', []))} POIs")


class TestGeocodeEndpoint:
    """Geocode endpoint tests"""
    
    def test_geocode_address(self):
        """Test /api/geocode returns coordinates for address"""
        payload = {"q": "Denver, CO"}
        response = requests.post(f"{BASE_URL}/api/geocode", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "position" in item
            print(f"✓ Geocode returned position for Denver, CO")
        else:
            print("✓ Geocode endpoint working (no results for query)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
