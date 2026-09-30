def test_memory_save_requires_expert_validation_and_saves_approved_outcome(client):
    rejected = client.post("/memory/save", json={"day": 1, "expert_validated": False, "outcome": "not approved"})
    assert rejected.status_code == 400
    assert "Expert validation is required" in rejected.json()["detail"]

    response = client.post("/memory/save", json={"day": 1, "expert_validated": True, "outcome": "Condition improved after treatment"})
    assert response.status_code == 200
    body = response.json()
    assert body["saved"] is True
    assert body["mode"] == "demo"
    assert body["message"] == "Incident #101 saved to persistent demo memory. Future cases can learn from this outcome."
