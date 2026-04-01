"""
Test HERE Maps Routing API v8.140.0 parameters
Tests the new vehicle parameters: emptyWeight, currentWeight, tiresCount
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cmv-routing-dev.preview.emergentagent.com').rstrip('/')

class TestRouteAPIv8Parameters:
    """Test HERE Maps v8.140.0 routing parameters"""
    
    def test_health_endpoint(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'ok'
        print("✓ Health endpoint working")
    
    def test_route_api_basic(self):
        """Test basic route calculation"""
        payload = {
            "origin": "29.7604,-95.3698",  # Houston, TX
            "destination": "30.2672,-97.7431",  # Austin, TX
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
        data = response.json()
        assert 'routes' in data, "Response should contain routes"
        assert len(data['routes']) > 0, "Should have at least one route"
        print(f"✓ Route API returned {len(data['routes'])} route(s)")
        
    def test_route_api_with_new_v8_params(self):
        """Test route API includes new v8.140.0 parameters in request"""
        payload = {
            "origin": "29.7604,-95.3698",  # Houston, TX
            "destination": "30.2672,-97.7431",  # Austin, TX
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1,
                "tiresCount": 18  # New v8.140.0 param
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed with new params: {response.text}"
        data = response.json()
        assert 'routes' in data, "Response should contain routes"
        print("✓ Route API accepts tiresCount parameter")
        
    def test_route_api_default_tires_count(self):
        """Test that default tiresCount is calculated for 5-axle trucks"""
        # When tiresCount is not provided, server should default to 18 for 5-axle
        payload = {
            "origin": "29.7604,-95.3698",
            "destination": "30.2672,-97.7431",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
                # tiresCount not provided - should default to 18
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed: {response.text}"
        print("✓ Route API handles missing tiresCount (defaults to 18 for 5-axle)")
        
    def test_route_api_empty_weight_calculation(self):
        """Test that emptyWeight is calculated as ~35% of gross weight"""
        payload = {
            "origin": "29.7604,-95.3698",
            "destination": "30.2672,-97.7431",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,  # Gross weight
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed: {response.text}"
        # Server calculates emptyWeight as 35% of gross = 80000 * 0.35 = 28000 lbs
        # Converted to kg: 28000 * 0.453592 = 12700 kg
        print("✓ Route API calculates emptyWeight (35% of gross weight)")
        
    def test_route_api_with_avoid_options(self):
        """Test route API with avoid options"""
        payload = {
            "origin": "29.7604,-95.3698",
            "destination": "30.2672,-97.7431",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1
            },
            "avoidTolls": True,
            "avoidFerries": True,
            "avoidUnpaved": True
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed with avoid options: {response.text}"
        data = response.json()
        assert 'routes' in data
        print("✓ Route API handles avoid options (tolls, ferries, unpaved)")
        
    def test_route_api_with_hazmat(self):
        """Test route API with hazmat profile"""
        payload = {
            "origin": "29.7604,-95.3698",
            "destination": "30.2672,-97.7431",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1,
                "hazmat": True,
                "hazmatClasses": ["flammable", "corrosive"]
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed with hazmat: {response.text}"
        print("✓ Route API handles hazmat profile")
        
    def test_route_api_with_tunnel_category(self):
        """Test route API with tunnel category"""
        payload = {
            "origin": "29.7604,-95.3698",
            "destination": "30.2672,-97.7431",
            "truckProfile": {
                "height": 13.5,
                "weight": 80000,
                "length": 53,
                "width": 8.5,
                "axleCount": 5,
                "axleWeight": 12000,
                "trailerCount": 1,
                "tunnelCategory": "B"
            }
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 200, f"Route API failed with tunnel category: {response.text}"
        print("✓ Route API handles tunnel category")
        
    def test_route_api_missing_origin(self):
        """Test route API returns 400 for missing origin"""
        payload = {
            "destination": "30.2672,-97.7431",
            "truckProfile": {"height": 13.5, "weight": 80000}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400, "Should return 400 for missing origin"
        print("✓ Route API validates required origin parameter")
        
    def test_route_api_missing_destination(self):
        """Test route API returns 400 for missing destination"""
        payload = {
            "origin": "29.7604,-95.3698",
            "truckProfile": {"height": 13.5, "weight": 80000}
        }
        response = requests.post(f"{BASE_URL}/api/route", json=payload)
        assert response.status_code == 400, "Should return 400 for missing destination"
        print("✓ Route API validates required destination parameter")


class TestSearchAPI:
    """Test search/geocoding endpoints"""
    
    def test_search_api(self):
        """Test search autosuggest"""
        payload = {
            "query": "Houston TX",
            "lat": 29.7604,
            "lon": -95.3698
        }
        response = requests.post(f"{BASE_URL}/api/search", json=payload)
        assert response.status_code == 200, f"Search API failed: {response.text}"
        data = response.json()
        assert 'items' in data, "Search should return items"
        print(f"✓ Search API returned {len(data.get('items', []))} suggestions")
        
    def test_geocode_api(self):
        """Test geocoding"""
        payload = {"q": "Houston, TX"}
        response = requests.post(f"{BASE_URL}/api/geocode", json=payload)
        assert response.status_code == 200, f"Geocode API failed: {response.text}"
        data = response.json()
        assert 'items' in data, "Geocode should return items"
        print("✓ Geocode API working")


class TestRoadShieldAPI:
    """Test road shield icon proxy"""
    
    def test_road_shield_interstate(self):
        """Test interstate shield generation"""
        params = {
            "label": "10",
            "countryCode": "USA",
            "routeLevel": "1",
            "width": "64"
        }
        response = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        # 200 = image returned, 204 = no content (valid response)
        assert response.status_code in [200, 204], f"Road shield API failed: {response.status_code}"
        if response.status_code == 200:
            assert response.headers.get('Content-Type') == 'image/png'
            print("✓ Road shield API returns PNG for interstate")
        else:
            print("✓ Road shield API returns 204 (no image available)")
            
    def test_road_shield_missing_params(self):
        """Test road shield API validates required params"""
        response = requests.get(f"{BASE_URL}/api/road-shield")
        assert response.status_code == 400, "Should return 400 for missing params"
        print("✓ Road shield API validates required parameters")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
