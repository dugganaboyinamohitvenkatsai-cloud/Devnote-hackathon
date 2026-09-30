def test_demo_snapshots_cover_day_one_thirty_sixty(client):
    day1 = client.get("/demo/day/1")
    assert day1.status_code == 200
    body1 = day1.json()
    assert body1["memory"]["stats"] == {"historical_incidents": 0, "expert_validations": 0, "successful_outcomes": 0}
    assert body1["incident"]["potential_diagnosis"].startswith("Potential")
    assert "Request expert validation" in body1["incident"]["recommendation"]

    day30 = client.get("/demo/day/30")
    assert day30.status_code == 200
    body30 = day30.json()
    assert body30["memory"]["stats"]["historical_incidents"] == 1
    assert body30["memory"]["incidents"][0]["id"] == "#101"
    assert "High similarity" in body30["retrieval"]["result_detail"]

    day60 = client.get("/demo/day/60")
    assert day60.status_code == 200
    body60 = day60.json()
    assert body60["memory"]["stats"] == {"historical_incidents": 2, "expert_validations": 2, "successful_outcomes": 2}
    assert [item["id"] for item in body60["memory"]["incidents"]] == ["#101", "#102"]
    assert "Multiple outcomes compared" in body60["retrieval"]["result_detail"]
