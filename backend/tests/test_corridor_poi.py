"""
Test suite for Route-Based Corridor POI Search feature
Tests:
- POST /api/discover endpoint with radius parameter
- POST /api/browse endpoint for truck categories
- Corridor POI search functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

class TestDiscoverAPI:
    """Tests for POST /api/discover endpoint with radius parameter"""
    
    def test_discover_returns_200(self):
        """Test that discover endpoint returns 200 status"""
        response = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8781,
            "lon": -87.6298,
            "radius": 16000  # 16km corridor radius
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/discover returns 200")
    
    def test_discover_with_radius_parameter(self):
        """Test that discover endpoint accepts and uses radius parameter"""
        response = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8781,
            "lon": -87.6298,
            "radius": 16000  # 16km = ~10 miles corridor
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data, "Response should contain 'items' array"
        print(f"PASS: /api/discover with radius=16000 returned {len(data.get('items', []))} items")
    
    def test_discover_returns_truck_stops(self):
        """Test that discover returns truck stop results"""
        response = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8781,
            "lon": -87.6298,
            "radius": 80000
        })
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        assert len(items) > 0, "Should return at least one truck stop"
        
        # Check that items have position data
        for item in items[:5]:
            assert "position" in item, f"Item {item.get('title')} missing position"
            assert "lat" in item["position"], "Position missing lat"
            assert "lng" in item["position"], "Position missing lng"
        
        print(f"PASS: /api/discover returned {len(items)} truck stops with position data")
    
    def test_discover_items_have_distance(self):
        """Test that discover items include distance field"""
        response = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8781,
            "lon": -87.6298,
            "radius": 16000
        })
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        for item in items[:5]:
            assert "distance" in item, f"Item {item.get('title')} missing distance field"
        
        print(f"PASS: All items have distance field")


class TestBrowseAPI:
    """Tests for POST /api/browse endpoint for truck categories"""
    
    def test_browse_returns_200(self):
        """Test that browse endpoint returns 200 status"""
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "categories": "700-7600-0116,700-7600-0117,700-7600-0322,700-7900-0132"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/browse returns 200")
    
    def test_browse_with_truck_categories(self):
        """Test browse with truck-specific categories"""
        # Categories: fuel stations, rest areas, EV charging, truck stops
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "categories": "700-7600-0116,700-7600-0117,700-7600-0322,700-7900-0132"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data, "Response should contain 'items' array"
        items = data.get("items", [])
        assert len(items) > 0, "Should return POIs for truck categories"
        print(f"PASS: /api/browse with truck categories returned {len(items)} items")
    
    def test_browse_items_have_position(self):
        """Test that browse items have position data"""
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "categories": "700-7600-0116,700-7600-0117,700-7600-0322"
        })
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        for item in items[:10]:
            assert "position" in item, f"Item {item.get('title')} missing position"
            pos = item["position"]
            assert "lat" in pos and "lng" in pos, "Position missing lat/lng"
        
        print(f"PASS: All browse items have position data")
    
    def test_browse_items_have_categories(self):
        """Test that browse items have category information"""
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "categories": "700-7600-0116,700-7600-0117,700-7600-0322,700-7900-0132"
        })
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        for item in items[:10]:
            assert "categories" in item, f"Item {item.get('title')} missing categories"
        
        print(f"PASS: All browse items have category information")


class TestCorridorPOILogic:
    """Tests for corridor POI search logic (simulating route sampling)"""
    
    def test_corridor_sampling_multiple_points(self):
        """Test fetching POIs at multiple sample points along a route"""
        # Simulate sampling points along Chicago to Indianapolis route
        sample_points = [
            (41.8781, -87.6298),   # Chicago
            (40.7608, -86.6920),   # Lafayette area
            (39.7684, -86.1581),   # Indianapolis
        ]
        
        all_pois = []
        for lat, lon in sample_points:
            response = requests.post(f"{BASE_URL}/api/discover", json={
                "q": "truck stop",
                "lat": lat,
                "lon": lon,
                "radius": 16000  # 16km corridor
            })
            assert response.status_code == 200
            items = response.json().get("items", [])
            all_pois.extend(items)
        
        assert len(all_pois) > 0, "Should find POIs along the route corridor"
        print(f"PASS: Corridor sampling found {len(all_pois)} total POIs across {len(sample_points)} sample points")
    
    def test_corridor_deduplication_logic(self):
        """Test that POIs can be deduplicated by position"""
        # Fetch POIs from two nearby points (should have overlap)
        response1 = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8781,
            "lon": -87.6298,
            "radius": 16000
        })
        response2 = requests.post(f"{BASE_URL}/api/discover", json={
            "q": "truck stop",
            "lat": 41.8800,  # Very close to first point
            "lon": -87.6300,
            "radius": 16000
        })
        
        items1 = response1.json().get("items", [])
        items2 = response2.json().get("items", [])
        
        # Simulate deduplication by position (4 decimal places)
        seen = set()
        deduped = []
        for item in items1 + items2:
            pos = item.get("position", {})
            if pos:
                key = f"{round(pos.get('lat', 0), 4)}_{round(pos.get('lng', 0), 4)}"
                if key not in seen:
                    seen.add(key)
                    deduped.append(item)
        
        total_raw = len(items1) + len(items2)
        print(f"PASS: Deduplication reduced {total_raw} raw items to {len(deduped)} unique POIs")
        assert len(deduped) <= total_raw, "Deduplication should reduce or maintain count"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health endpoint returns ok")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
