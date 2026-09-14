"""Tests for FastAPI application startup and health check endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client instance."""
    with TestClient(app) as test_client:
        yield test_client


def test_app_starts(client: TestClient):
    """Verify that the FastAPI application initializes without errors."""
    assert app is not None
    assert app.title == "SecureX API"


def test_health_endpoint_status_200(client: TestClient):
    """Verify that GET /health returns HTTP 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_content(client: TestClient):
    """Verify that GET /health contains status 'ok' and correct service name."""
    response = client.get("/health")
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "SecureX API"


def test_api_v1_health_endpoint(client: TestClient):
    """Verify that GET /api/v1/health also returns status 'ok'."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "SecureX API"


def test_cors_preflight_for_frontend_origin(client: TestClient):
    """Verify that CORS preflight request from localhost:3000 is allowed."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_error_envelope_on_404(client: TestClient):
    """Verify that non-existent routes return the standardized error envelope."""
    response = client.get("/non-existent-route")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
