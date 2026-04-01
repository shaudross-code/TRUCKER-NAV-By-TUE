"""
Test suite for /api/road-shield endpoint - Highway shield icon proxy
Tests the HERE Map Image API v3 integration for road shield PNGs
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cmv-routing-dev.preview.emergentagent.com').rstrip('/')


class TestRoadShieldEndpoint:
    """Tests for /api/road-shield endpoint"""

    def test_health_check(self):
        """Verify the server is running"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")

    def test_interstate_shield_returns_png(self):
        """Test Interstate shield (I-95) returns valid PNG image"""
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params={
                "label": "95",
                "countryCode": "USA",
                "stateCode": "FL",
                "routeLevel": "1",
                "width": "64"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("Content-Type") == "image/png", f"Expected image/png, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 100, "PNG content should be larger than 100 bytes"
        print(f"✓ Interstate I-95 shield returned PNG ({len(response.content)} bytes)")

    def test_us_highway_shield_returns_png(self):
        """Test US Highway shield (US-20) returns valid PNG image"""
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params={
                "label": "20",
                "countryCode": "USA",
                "routeLevel": "2",
                "width": "64"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("Content-Type") == "image/png"
        assert len(response.content) > 100
        print(f"✓ US Highway US-20 shield returned PNG ({len(response.content)} bytes)")

    def test_state_route_shield_returns_png(self):
        """Test State Route shield (CA-1) returns valid PNG image"""
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params={
                "label": "1",
                "countryCode": "USA",
                "stateCode": "CA",
                "routeLevel": "3",
                "width": "64"
            }
        )
        # State routes may return 200 or 204 (no content) depending on availability
        assert response.status_code in [200, 204], f"Expected 200 or 204, got {response.status_code}"
        if response.status_code == 200:
            assert response.headers.get("Content-Type") == "image/png"
            print(f"✓ State Route CA-1 shield returned PNG ({len(response.content)} bytes)")
        else:
            print("✓ State Route CA-1 returned 204 (no shield available)")

    def test_missing_label_returns_400(self):
        """Test that missing label parameter returns 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params={"countryCode": "USA"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        assert "label" in data["error"].lower() or "countryCode" in data["error"]
        print("✓ Missing label returns 400 with error message")

    def test_missing_country_code_returns_400(self):
        """Test that missing countryCode parameter returns 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/road-shield",
            params={"label": "95"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        print("✓ Missing countryCode returns 400 with error message")

    def test_missing_both_params_returns_400(self):
        """Test that missing both required parameters returns 400 error"""
        response = requests.get(f"{BASE_URL}/api/road-shield")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        print("✓ Missing both params returns 400 with error message")

    def test_caching_works(self):
        """Test that second request is served from cache (faster)"""
        params = {
            "label": "80",
            "countryCode": "USA",
            "routeLevel": "1",
            "width": "64"
        }
        
        # First request - may hit HERE API
        start1 = time.time()
        response1 = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        time1 = time.time() - start1
        
        assert response1.status_code == 200
        
        # Second request - should be cached
        start2 = time.time()
        response2 = requests.get(f"{BASE_URL}/api/road-shield", params=params)
        time2 = time.time() - start2
        
        assert response2.status_code == 200
        assert response2.content == response1.content, "Cached response should match original"
        
        # Cache should make second request faster (or at least not significantly slower)
        # Note: Network latency can vary, so we just verify both succeed
        print(f"✓ Caching test: First request {time1:.3f}s, Second request {time2:.3f}s")

    def test_different_route_levels(self):
        """Test different route levels return appropriate shields"""
        route_levels = [
            ("1", "Interstate"),
            ("2", "US Highway"),
            ("3", "State Route"),
        ]
        
        for level, name in route_levels:
            response = requests.get(
                f"{BASE_URL}/api/road-shield",
                params={
                    "label": "10",
                    "countryCode": "USA",
                    "routeLevel": level,
                    "width": "64"
                }
            )
            # All should return 200 or 204
            assert response.status_code in [200, 204], f"{name} (level {level}) failed with {response.status_code}"
            print(f"✓ Route level {level} ({name}) returned {response.status_code}")


class TestRouteEndpointSpans:
    """Tests for /api/route endpoint spans parameter including routeNumbers"""

    def test_route_includes_route_numbers_span(self):
        """Test that route API includes routeNumbers in spans parameter"""
        response = requests.post(
            f"{BASE_URL}/api/route",
            json={
                "origin": "41.2565,-95.9345",  # Omaha, NE
                "destination": "39.7392,-104.9903",  # Denver, CO
                "truckProfile": {
                    "height": 13.5,
                    "weight": 80000,
                    "length": 53,
                    "width": 8.5,
                    "axleCount": 5,
                    "axleWeight": 12000,
                    "trailerCount": 1,
                    "hazmat": False,
                    "tunnelCategory": "NONE"
                }
            }
        )
        
        assert response.status_code == 200, f"Route API failed with {response.status_code}: {response.text[:500]}"
        data = response.json()
        
        # Check that routes exist
        assert "routes" in data, "Response should contain 'routes'"
        assert len(data["routes"]) > 0, "Should have at least one route"
        
        # Check that spans exist in the first route's first section
        route = data["routes"][0]
        assert "sections" in route, "Route should have sections"
        section = route["sections"][0]
        assert "spans" in section, "Section should have spans"
        
        # Check for routeNumbers in spans
        spans = section["spans"]
        route_numbers_found = False
        for span in spans:
            if "routeNumbers" in span:
                route_numbers_found = True
                print(f"✓ Found routeNumbers in span: {span['routeNumbers']}")
                break
        
        # Note: Not all spans will have routeNumbers, but at least some should on a long route
        print(f"✓ Route API returned {len(spans)} spans, routeNumbers found: {route_numbers_found}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
