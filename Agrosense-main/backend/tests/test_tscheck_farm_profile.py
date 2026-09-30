def test_farm_profile_is_green_valley_tomato_field(client):
    response = client.get("/farm")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Green Valley Farm"
    assert body["field"] == "Tomato Field A"
    assert body["crop"] == "Tomato"
