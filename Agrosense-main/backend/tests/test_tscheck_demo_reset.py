def test_demo_reset_returns_day_one_and_demo_health_is_explicit(client):
    reset = client.post("/demo/reset")
    assert reset.status_code == 200
    body = reset.json()
    assert body["day"] == 1
    assert body["memory"]["stats"]["historical_incidents"] == 0

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {
        "service": "agrosense-agent",
        "mode": "demo",
        "connected": False,
        "message": "Demo memory active — not connected to real Hindsight",
    }
