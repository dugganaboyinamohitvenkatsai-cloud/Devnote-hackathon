def test_memory_search_returns_deterministic_day_sixty_cases(client):
    response = client.post("/memory/search", json={"day": 60, "query": "brown spots"})
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "demo"
    assert body["found"] == 2
    assert [item["id"] for item in body["incidents"]] == ["#101", "#102"]
    assert "historical case" in body["message"]
