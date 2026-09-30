"""Deterministic farm memory for the offline AgroSense hackathon demo."""

from __future__ import annotations

import os

from models.agro import (
    AgentStep,
    CurrentIncident,
    DemoSnapshot,
    Evidence,
    FarmProfile,
    Incident,
    MemoryResponse,
    MemoryRetrieval,
    MemorySaveResponse,
    MemoryStats,
    RoverEvidence,
)


class HindsightMemory:
    """A narrow seam for a future Hindsight adapter with a truthful local fallback."""

    def __init__(self) -> None:
        self.mode = "real" if os.getenv("HINDSIGHT_MODE", "demo").lower() == "real" else "demo"
        self.saved_incidents: set[str] = set()

    def _incidents(self, day: int) -> list[Incident]:
        historical = [
            Incident(
                id="#101",
                day="DAY 1",
                crop="Tomato",
                field="Field A",
                symptoms="Brown leaf spots",
                weather="High humidity · 29°C · 82%",
                diagnosis="Potential fungal leaf disease",
                treatment="Validated fungicide response + airflow check",
                outcome="Condition improved after treatment",
                expert_validated=True,
                similarity="Reference case",
            ),
            Incident(
                id="#102",
                day="DAY 30",
                crop="Tomato",
                field="Field A",
                symptoms="Brown leaf spots returning",
                weather="High humidity · 29°C · 82%",
                diagnosis="Potential fungal leaf disease",
                treatment="Same validated response, applied earlier",
                outcome="Positive outcome recorded",
                expert_validated=True,
                similarity="High similarity",
            ),
        ]
        if day <= 1:
            return []
        if day <= 30:
            return historical[:1]
        return historical

    def _farm(self) -> FarmProfile:
        return FarmProfile(
            name="Green Valley Farm",
            field="Tomato Field A",
            crop="Tomato",
            soil="Loamy",
            planting_date="June 12",
            irrigation="Drip irrigation",
            previous_issues="Leaf disease",
            yield_status="Good",
        )

    def _incident(self, day: int) -> CurrentIncident:
        prompts = {
            1: "Brown spots detected on tomato leaves",
            30: "Brown spots are appearing again on tomato leaves",
            60: "Brown spots have returned across the same tomato row",
        }
        ids = {1: "#101", 30: "#102", 60: "#103"}
        return CurrentIncident(
            id=ids[day],
            crop="Tomato",
            field="Field A",
            symptoms=prompts[day],
            weather="High humidity",
            temperature="29°C",
            humidity="82%",
            evidence=[
                Evidence(label="Image", value="Leaf image captured"),
                Evidence(label="Thermal", value="Slightly elevated leaf temperature", status="supporting"),
                Evidence(label="Weather", value="High humidity · 82%"),
                Evidence(label="GPS", value="Field A · 34.052° N"),
            ],
            potential_diagnosis="Potential fungal leaf disease",
            recommendation=(
                "Insufficient historical evidence. Request expert validation."
                if day == 1
                else "Consider the previously validated response as a reference."
            ),
            confidence="Moderate" if day == 1 else "High",
        )

    def _retrieval(self, day: int, incidents: list[Incident]) -> MemoryRetrieval:
        if not incidents:
            return MemoryRetrieval(
                current_incident="Current incident · Tomato / brown spots",
                result_label="No highly similar previous incident found",
                result_detail="The memory bank has limited context for this first case.",
                reasoning=["Crop and symptoms indexed", "No validated outcome to compare", "Expert validation requested"],
            )
        if day <= 30:
            return MemoryRetrieval(
                current_incident="Current incident · Tomato / brown spots",
                result_label="Similar historical incident found",
                result_detail="Incident #101 · High similarity",
                reasoning=["Same crop and field", "Matching humidity and leaf symptoms", "Positive expert-validated outcome"],
            )
        return MemoryRetrieval(
            current_incident="Current incident · Tomato / brown spots",
            result_label="2 historical cases found",
            result_detail="Incidents #101 + #102 · Multiple outcomes compared",
            reasoning=["Crop and symptoms matched", "Weather and previous diagnoses compared", "Two positive expert-validated outcomes"],
        )

    def get_snapshot(self, day: int) -> DemoSnapshot:
        normalized_day = 1 if day <= 1 else 30 if day <= 30 else 60
        incidents = self._incidents(normalized_day)
        stats = MemoryStats(
            historical_incidents=len(incidents),
            expert_validations=len(incidents),
            successful_outcomes=len(incidents),
        )
        steps = [
            AgentStep(id="evidence", label="Evidence collected", detail="Rover + farmer signal", status="complete"),
            AgentStep(id="analyze", label="Crop and symptoms analyzed", detail="Tomato / brown spots", status="complete"),
            AgentStep(id="search", label="Searching Hindsight", detail="Querying persistent farm experience", status="complete"),
            AgentStep(id="retrieve", label="Historical incidents retrieved", detail=f"{len(incidents)} relevant case(s)", status="complete" if incidents else "active"),
            AgentStep(id="compare", label="Previous outcomes compared", detail="Evidence-weighted reasoning", status="complete" if len(incidents) > 0 else "pending"),
            AgentStep(id="recommend", label="Recommendation generated", detail="Contextual, not authoritative", status="complete" if normalized_day > 1 else "active"),
            AgentStep(id="expert", label="Expert validation", detail="Decision layer required", status="active"),
            AgentStep(id="save", label="Outcome saved", detail="Becomes future experience", status="pending"),
        ]
        chat = [
            {"speaker": "FARMER", "text": "My tomato leaves have brown spots again." if normalized_day > 1 else "My tomato leaves have brown spots."},
            {"speaker": "AGROSENSE", "text": "I found a similar incident in your farm memory." if incidents else "I have limited prior memory for this crop issue."},
            {"speaker": "AGROSENSE", "text": "Incident #101 had similar symptoms and high humidity." if incidents else "I am requesting expert validation before recommending action."},
            {"speaker": "AGROSENSE", "text": "The previous expert-validated response resulted in improvement." if incidents else "Every validated outcome will become experience for the next incident."},
        ]
        return DemoSnapshot(
            day=normalized_day,
            day_label=f"DAY {normalized_day}",
            farm=self._farm(),
            incident=self._incident(normalized_day),
            rover=RoverEvidence(
                status="CONNECTED",
                motto="Rover = eyes and hands",
                sensors=["Camera", "Thermal sensor", "GPS", "Field sensors"],
                image_note="Leaf image captured",
                thermal_note="Supporting signal · slightly elevated",
                location_note="Field A · row 04",
            ),
            agent_state="IDLE",
            agent_steps=steps,
            retrieval=self._retrieval(normalized_day, incidents),
            memory=MemoryResponse(
                mode="demo",
                label="DEMO MEMORY · NOT REAL HINDSIGHT",
                stats=stats,
                incidents=incidents,
            ),
            chat=chat,
        )

    def search_memory(self, day: int) -> tuple[list[Incident], str]:
        incidents = self._incidents(day)
        message = "No highly similar previous incident found." if not incidents else f"{len(incidents)} historical case(s) matched by crop, symptoms, weather and outcomes."
        return incidents, message

    def save_incident(self, day: int, outcome: str, expert_validated: bool) -> MemorySaveResponse:
        incident_id = {1: "#101", 30: "#102", 60: "#103"}.get(day, "#103")
        self.saved_incidents.add(incident_id)
        return MemorySaveResponse(
            saved=True,
            mode="demo",
            incident_id=incident_id,
            message=f"Incident {incident_id} saved to persistent demo memory. Future cases can learn from this outcome.",
        )


memory = HindsightMemory()