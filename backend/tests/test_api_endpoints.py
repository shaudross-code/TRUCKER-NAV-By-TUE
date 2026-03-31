"""
Backend API endpoint tests for TRUCKER-NAV-By-TUE
Tests the Express+Vite server endpoints
"""
import pytest
import requests
import os

# Use the preview URL for testing
BASE_URL = "https://navigation-staging.preview.emergentagent.com"


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_200(self):
        """Test that /health returns 200 OK"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print(f"Health check: {response.json()}")
    
    def test_health_endpoint_returns_correct_json(self):
        """Test that /health returns correct JSON structure"""
        response = requests.get(f"{BASE_URL}/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "service" in data
        assert data["service"] == "trucker-nav"
        print(f"Health response: {data}")


class TestIPLocationEndpoint:
    """IP-based geolocation endpoint tests"""
    
    def test_ip_location_returns_200(self):
        """Test that /api/ip-location returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        assert response.status_code == 200
        print(f"IP location: {response.json()}")
    
    def test_ip_location_returns_coordinates(self):
        """Test that /api/ip-location returns lat/lon"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        data = response.json()
        assert "lat" in data
        assert "lon" in data
        assert isinstance(data["lat"], (int, float))
        assert isinstance(data["lon"], (int, float))
        print(f"Coordinates: lat={data['lat']}, lon={data['lon']}")
    
    def test_ip_location_returns_city(self):
        """Test that /api/ip-location returns city info"""
        response = requests.get(f"{BASE_URL}/api/ip-location")
        data = response.json()
        assert "city" in data
        assert "region" in data
        assert "country" in data
        print(f"Location: {data['city']}, {data['region']}, {data['country']}")


class TestBrowseEndpoint:
    """Browse API endpoint tests"""
    
    def test_browse_returns_200(self):
        """Test that /api/browse returns 200 OK"""
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "categories": "700-7600-0116"  # Truck stops
        })
        assert response.status_code == 200
        print(f"Browse returned {len(response.json().get('items', []))} items")
    
    def test_browse_returns_items(self):
        """Test that /api/browse returns items array"""
        response = requests.post(f"{BASE_URL}/api/browse", json={
            "lat": 41.8781,
            "lon": -87.6298
        })
        data = response.json()
        assert "items" in data
        print(f"Browse items count: {len(data['items'])}")


class TestDiscoverEndpoint:
    """Discover API endpoint tests"""
    
    def test_discover_returns_200(self):
        """Test that /api/discover returns 200 OK"""
        response = requests.post(f"{BASE_URL}/api/discover", json={
            "lat": 41.8781,
            "lon": -87.6298,
            "q": "truck stop"
        })
        assert response.status_code == 200
        print(f"Discover returned {len(response.json().get('items', []))} items")


class TestFuelPricesEndpoint:
    """Fuel prices API endpoint tests"""
    
    def test_fuel_prices_returns_200(self):
        """Test that /api/fuel-prices returns 200 OK"""
        response = requests.post(f"{BASE_URL}/api/fuel-prices", json={
            "lat": 41.8781,
            "lon": -87.6298
        })
        assert response.status_code == 200
        print(f"Fuel prices returned {len(response.json().get('stations', []))} stations")
    
    def test_fuel_prices_returns_stations(self):
        """Test that /api/fuel-prices returns stations array"""
        response = requests.post(f"{BASE_URL}/api/fuel-prices", json={
            "lat": 41.8781,
            "lon": -87.6298
        })
        data = response.json()
        assert "stations" in data
        assert "total" in data
        print(f"Total stations: {data['total']}")


class TestParkingStatusEndpoint:
    """Parking status API endpoint tests"""
    
    def test_parking_status_get_returns_200(self):
        """Test that GET /api/poi/parking-status returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/poi/parking-status", params={
            "poiId": "test_poi_123"
        })
        assert response.status_code == 200
        print(f"Parking status: {response.json()}")
    
    def test_parking_status_post_returns_200(self):
        """Test that POST /api/poi/parking-status returns 200 OK"""
        response = requests.post(f"{BASE_URL}/api/poi/parking-status", json={
            "poiId": "test_poi_456",
            "status": "light",
            "name": "Test POI",
            "lat": 41.8781,
            "lon": -87.6298
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Parking status update: {data}")


class TestFacilitiesEndpoint:
    """Facilities API endpoint tests"""
    
    def test_facilities_get_returns_200(self):
        """Test that GET /api/facilities returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/facilities", params={
            "lat": 41.8781,
            "lon": -87.6298
        })
        assert response.status_code == 200
        data = response.json()
        assert "facilities" in data
        print(f"Facilities count: {len(data['facilities'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
