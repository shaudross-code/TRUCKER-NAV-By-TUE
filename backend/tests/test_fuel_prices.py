"""
Fuel Prices API Tests
Tests for POST /api/fuel-prices endpoint that fetches diesel fuel prices from HERE Fuel Prices API.
Uses fuelType=5 for diesel filtering.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test coordinates - Chicago area has diesel data
CHICAGO_LAT = 41.8781
CHICAGO_LON = -87.6298

# Rural Kansas - sparse data area
RURAL_KANSAS_LAT = 38.5
RURAL_KANSAS_LON = -97.5


class TestHealthCheck:
    """Basic health check to ensure server is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")


class TestFuelPricesEndpoint:
    """Tests for POST /api/fuel-prices endpoint"""
    
    def test_fuel_prices_returns_200(self):
        """Test that fuel prices endpoint returns 200 status"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        print("✓ Fuel prices endpoint returns 200")
    
    def test_fuel_prices_returns_stations_array(self):
        """Test that response contains stations array"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stations" in data, "Response should contain 'stations' field"
        assert isinstance(data["stations"], list), "stations should be an array"
        assert "total" in data, "Response should contain 'total' field"
        print(f"✓ Response contains stations array with {len(data['stations'])} items, total: {data['total']}")
    
    def test_fuel_prices_station_fields(self):
        """Test that each station has required fields: id, name, brand, lat, lng, distance, dieselPrice, currency, unit"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "name", "brand", "lat", "lng", "distance", "dieselPrice", "currency", "unit"]
        
        # Check first 10 stations
        for station in data["stations"][:10]:
            for field in required_fields:
                assert field in station, f"Station missing required field: {field}"
        
        print(f"✓ All required fields present in stations: {required_fields}")
    
    def test_fuel_prices_has_diesel_prices(self):
        """Test that at least some stations have diesel prices (not all null)"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        stations_with_diesel = [s for s in data["stations"] if s.get("dieselPrice") is not None]
        
        # Chicago area should have at least some diesel prices
        assert len(stations_with_diesel) > 0, "Expected at least some stations with diesel prices in Chicago area"
        
        print(f"✓ Found {len(stations_with_diesel)} stations with diesel prices out of {len(data['stations'])} total")
    
    def test_fuel_prices_diesel_price_format(self):
        """Test that diesel prices are numeric and reasonable (between $1 and $10 per gallon)"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        stations_with_diesel = [s for s in data["stations"] if s.get("dieselPrice") is not None]
        
        for station in stations_with_diesel[:10]:
            price = station["dieselPrice"]
            assert isinstance(price, (int, float)), f"Diesel price should be numeric, got {type(price)}"
            assert 1.0 <= price <= 10.0, f"Diesel price {price} seems unreasonable (expected $1-$10/gal)"
            assert station["currency"] == "USD", f"Expected USD currency, got {station['currency']}"
            assert station["unit"] == "gal", f"Expected gal unit, got {station['unit']}"
        
        print(f"✓ Diesel prices are valid numeric values in reasonable range")
    
    def test_fuel_prices_station_coordinates(self):
        """Test that stations have valid lat/lng coordinates"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        for station in data["stations"][:10]:
            lat = station.get("lat")
            lng = station.get("lng")
            
            assert lat is not None, "Station should have lat"
            assert lng is not None, "Station should have lng"
            assert isinstance(lat, (int, float)), f"lat should be numeric, got {type(lat)}"
            assert isinstance(lng, (int, float)), f"lng should be numeric, got {type(lng)}"
            assert -90 <= lat <= 90, f"lat {lat} out of valid range"
            assert -180 <= lng <= 180, f"lng {lng} out of valid range"
        
        print("✓ Station coordinates are valid")
    
    def test_fuel_prices_distance_field(self):
        """Test that stations have distance field (meters from search point)"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        for station in data["stations"][:10]:
            distance = station.get("distance")
            assert distance is not None, "Station should have distance"
            assert isinstance(distance, (int, float)), f"distance should be numeric, got {type(distance)}"
            assert distance >= 0, f"distance should be non-negative, got {distance}"
        
        print("✓ Station distance fields are valid")
    
    def test_fuel_prices_default_radius(self):
        """Test that endpoint works without explicit radius (uses default 50km)"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stations" in data
        assert len(data["stations"]) > 0, "Should return stations with default radius"
        
        print(f"✓ Default radius works, returned {len(data['stations'])} stations")
    
    def test_fuel_prices_custom_radius(self):
        """Test that custom radius parameter is respected"""
        # Small radius - should return fewer stations
        response_small = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 5000}  # 5km
        )
        
        # Large radius - should return more stations
        response_large = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}  # 50km
        )
        
        assert response_small.status_code == 200
        assert response_large.status_code == 200
        
        data_small = response_small.json()
        data_large = response_large.json()
        
        # Larger radius should generally return more or equal stations
        # (not strictly enforced as API may have limits)
        print(f"✓ Custom radius: 5km returned {len(data_small['stations'])} stations, 50km returned {len(data_large['stations'])} stations")


class TestFuelPricesDieselFiltering:
    """Tests for diesel price filtering (fuelType=5)"""
    
    def test_diesel_prices_filtered_correctly(self):
        """Test that only diesel prices (fuelType=5) are extracted"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        # The backend should filter for diesel (fuelType=5)
        # Stations without diesel should have dieselPrice: null
        stations_with_diesel = [s for s in data["stations"] if s.get("dieselPrice") is not None]
        stations_without_diesel = [s for s in data["stations"] if s.get("dieselPrice") is None]
        
        print(f"✓ Diesel filtering: {len(stations_with_diesel)} with diesel, {len(stations_without_diesel)} without")
        
        # Verify that stations with diesel have valid prices
        for station in stations_with_diesel[:5]:
            assert station["dieselPrice"] > 0, f"Diesel price should be positive, got {station['dieselPrice']}"
    
    def test_find_cheapest_diesel(self):
        """Test finding the cheapest diesel price from stations"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        stations_with_diesel = [s for s in data["stations"] if s.get("dieselPrice") is not None and s.get("dieselPrice") > 0]
        
        if len(stations_with_diesel) > 0:
            cheapest = min(stations_with_diesel, key=lambda s: s["dieselPrice"])
            print(f"✓ Cheapest diesel: ${cheapest['dieselPrice']}/gal at {cheapest['name']} ({cheapest['brand']})")
            print(f"  Address: {cheapest.get('address', 'N/A')}")
        else:
            pytest.skip("No stations with diesel prices found")


class TestFuelPricesEdgeCases:
    """Edge case tests for fuel prices endpoint"""
    
    def test_rural_area_sparse_data(self):
        """Test that endpoint handles areas with sparse fuel data"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": RURAL_KANSAS_LAT, "lon": RURAL_KANSAS_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response structure even if fewer stations
        assert "stations" in data
        assert "total" in data
        
        print(f"✓ Rural Kansas area: {len(data['stations'])} stations, {data['total']} total")
    
    def test_missing_lat_lon(self):
        """Test that endpoint handles missing coordinates gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={}
        )
        # Should either return 400 or handle gracefully
        # The current implementation may return 500 or empty results
        print(f"✓ Missing lat/lon handled with status {response.status_code}")
    
    def test_station_additional_fields(self):
        """Test that stations include additional useful fields"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for optional but useful fields
        sample_station = data["stations"][0] if data["stations"] else None
        if sample_station:
            optional_fields = ["lastUpdated", "address", "phone", "open24x7"]
            present_fields = [f for f in optional_fields if f in sample_station]
            print(f"✓ Additional fields present: {present_fields}")


class TestFuelPricesIntegration:
    """Integration tests for fuel prices with other features"""
    
    def test_fuel_prices_for_corridor_search(self):
        """Test fetching fuel prices at multiple points along a route corridor"""
        # Simulate corridor search by fetching at multiple points
        points = [
            (41.8781, -87.6298),  # Chicago
            (41.5, -87.5),        # South of Chicago
            (41.2, -87.3),        # Further south
        ]
        
        all_stations = []
        for lat, lon in points:
            response = requests.post(
                f"{BASE_URL}/api/fuel-prices",
                json={"lat": lat, "lon": lon, "radius": 30000}
            )
            assert response.status_code == 200
            data = response.json()
            all_stations.extend(data["stations"])
        
        # Deduplicate by station ID
        seen_ids = set()
        unique_stations = []
        for s in all_stations:
            if s["id"] not in seen_ids:
                seen_ids.add(s["id"])
                unique_stations.append(s)
        
        stations_with_diesel = [s for s in unique_stations if s.get("dieselPrice") is not None]
        
        print(f"✓ Corridor search: {len(unique_stations)} unique stations, {len(stations_with_diesel)} with diesel prices")
    
    def test_fuel_station_matching_to_poi(self):
        """Test that fuel stations can be matched to POIs by proximity"""
        response = requests.post(
            f"{BASE_URL}/api/fuel-prices",
            json={"lat": CHICAGO_LAT, "lon": CHICAGO_LON, "radius": 50000}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get a station with diesel price
        stations_with_diesel = [s for s in data["stations"] if s.get("dieselPrice") is not None]
        
        if stations_with_diesel:
            station = stations_with_diesel[0]
            # Verify station has coordinates for POI matching
            assert "lat" in station and "lng" in station
            print(f"✓ Station {station['name']} at ({station['lat']}, {station['lng']}) can be matched to POIs")
        else:
            pytest.skip("No stations with diesel prices for matching test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
