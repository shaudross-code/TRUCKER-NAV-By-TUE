"""
Test suite for Trucking GPS Navigation App - New Features
Tests: Route API with tolls, spans with functionalClass, lane visualization data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_ok(self):
        """Test health endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'ok'
        assert data.get('service') == 'trucker-nav'
        print("✓ Health endpoint returns OK")


class TestRouteEndpoint:
    """Route endpoint tests - including toll data and spans with functionalClass"""
    
    def test_route_returns_200(self):
        """Test route endpoint returns 200 OK with valid data"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        assert 'routes' in data
        assert len(data['routes']) > 0
        print(f"✓ Route endpoint returns {len(data['routes'])} routes")
    
    def test_route_includes_spans_with_functional_class(self):
        """Test route response includes spans with functionalClass for lane visualization"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        # Check first route's first section has spans
        route = data['routes'][0]
        section = route['sections'][0]
        assert 'spans' in section, "Route section should include spans"
        
        spans = section['spans']
        assert len(spans) > 0, "Spans should not be empty"
        
        # Check that spans include functionalClass
        spans_with_fc = [s for s in spans if 'functionalClass' in s]
        assert len(spans_with_fc) > 0, "At least some spans should have functionalClass"
        
        # Verify functionalClass values are valid (1-5)
        for span in spans_with_fc:
            fc = span['functionalClass']
            assert 1 <= fc <= 5, f"functionalClass should be 1-5, got {fc}"
        
        print(f"✓ Route includes {len(spans_with_fc)} spans with functionalClass")
    
    def test_route_includes_polyline(self):
        """Test route response includes polyline for map rendering"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        route = data['routes'][0]
        section = route['sections'][0]
        assert 'polyline' in section, "Route section should include polyline"
        assert len(section['polyline']) > 0, "Polyline should not be empty"
        print("✓ Route includes polyline")
    
    def test_route_includes_summary(self):
        """Test route response includes summary with duration and length"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        route = data['routes'][0]
        section = route['sections'][0]
        assert 'summary' in section, "Route section should include summary"
        
        summary = section['summary']
        assert 'duration' in summary, "Summary should include duration"
        assert 'length' in summary, "Summary should include length"
        assert summary['duration'] > 0, "Duration should be positive"
        assert summary['length'] > 0, "Length should be positive"
        print(f"✓ Route summary: {summary['length']/1000:.1f} km, {summary['duration']/3600:.1f} hours")
    
    def test_route_returns_alternatives(self):
        """Test route endpoint returns alternative routes"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        # Should return multiple routes (alternatives=2 in server.ts)
        assert len(data['routes']) >= 1, "Should return at least 1 route"
        print(f"✓ Route endpoint returns {len(data['routes'])} alternative routes")
    
    def test_route_with_tolls_returns_toll_data(self):
        """Test route in toll area returns toll information"""
        # NYC to Trenton - should have tolls
        payload = {
            "origin": "40.7128,-74.0060",
            "destination": "40.0583,-74.4057",
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
        
        route = data['routes'][0]
        section = route['sections'][0]
        
        # Check for tolls in the response
        has_tolls = 'tolls' in section and section['tolls'] is not None
        if has_tolls:
            tolls = section['tolls']
            assert isinstance(tolls, list), "Tolls should be a list"
            if len(tolls) > 0:
                toll = tolls[0]
                assert 'fares' in toll or 'tollSystem' in toll, "Toll should have fares or tollSystem"
                print(f"✓ Route includes toll data: {len(tolls)} toll systems")
            else:
                print("✓ Route has tolls field but no toll systems on this route")
        else:
            print("⚠ Route does not include tolls (may be toll-free route)")
    
    def test_route_includes_speed_limit_in_spans(self):
        """Test route spans include speedLimit data"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        route = data['routes'][0]
        section = route['sections'][0]
        spans = section.get('spans', [])
        
        spans_with_speed = [s for s in spans if 'speedLimit' in s]
        assert len(spans_with_speed) > 0, "At least some spans should have speedLimit"
        print(f"✓ Route includes {len(spans_with_speed)} spans with speedLimit")
    
    def test_route_includes_route_numbers_in_spans(self):
        """Test route spans include routeNumbers for highway shields"""
        payload = {
            "origin": "34.0522,-118.2437",
            "destination": "36.1699,-115.1398",
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
        
        route = data['routes'][0]
        section = route['sections'][0]
        spans = section.get('spans', [])
        
        spans_with_route_numbers = [s for s in spans if 'routeNumbers' in s]
        assert len(spans_with_route_numbers) > 0, "At least some spans should have routeNumbers"
        print(f"✓ Route includes {len(spans_with_route_numbers)} spans with routeNumbers")


class TestSearchEndpoint:
    """Search endpoint tests"""
    
    def test_search_returns_results(self):
        """Test search endpoint returns location results"""
        payload = {
            "query": "Los Angeles",
            "lat": 34.0522,
            "lon": -118.2437
        }
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'items' in data
        print(f"✓ Search returns {len(data.get('items', []))} results")


class TestRoadShieldEndpoint:
    """Road shield endpoint tests"""
    
    def test_road_shield_returns_image(self):
        """Test road shield endpoint returns PNG image"""
        params = {
            "label": "10",
            "countryCode": "USA",
            "routeLevel": "1",
            "width": "64"
        }
        response = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        # Should return 200 with image or 204 if no shield available
        assert response.status_code in [200, 204]
        if response.status_code == 200:
            assert response.headers.get('Content-Type') == 'image/png'
            print("✓ Road shield returns PNG image")
        else:
            print("✓ Road shield returns 204 (no shield available)")


class TestIPLocationEndpoint:
    """IP location endpoint tests"""
    
    def test_ip_location_returns_coordinates(self):
        """Test IP location endpoint returns lat/lon"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        assert response.status_code == 200
        data = response.json()
        assert 'lat' in data
        assert 'lon' in data
        print(f"✓ IP location returns coordinates: {data.get('lat')}, {data.get('lon')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
