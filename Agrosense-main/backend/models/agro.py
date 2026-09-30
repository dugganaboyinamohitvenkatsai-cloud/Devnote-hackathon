from typing import Literal

from pydantic import BaseModel, Field


class FarmProfile(BaseModel):
    name: str
    field: str
    crop: str
    soil: str
    planting_date: str
    irrigation: str
    previous_issues: str
    yield_status: str


class Incident(BaseModel):
    id: str
    day: str
    crop: str
    field: str
    symptoms: str
    weather: str
    diagnosis: str
    treatment: str
    outcome: str
    expert_validated: bool
    similarity: str


class Evidence(BaseModel):
    label: str
    value: str
    status: Literal["captured", "supporting"] = "captured"


class CurrentIncident(BaseModel):
    id: str
    crop: str
    field: str
    symptoms: str
    weather: str
    temperature: str
    humidity: str
    evidence: list[Evidence]
    potential_diagnosis: str
    recommendation: str
    confidence: str


class RoverEvidence(BaseModel):
    status: str
    motto: str
    sensors: list[str]
    image_note: str
    thermal_note: str
    location_note: str


class AgentStep(BaseModel):
    id: str
    label: str
    detail: str
    status: Literal["complete", "active", "pending"]


class MemoryRetrieval(BaseModel):
    current_incident: str
    result_label: str
    result_detail: str
    reasoning: list[str]


class MemoryStats(BaseModel):
    historical_incidents: int
    expert_validations: int
    successful_outcomes: int


class MemoryResponse(BaseModel):
    mode: Literal["demo", "real"]
    label: str
    stats: MemoryStats
    incidents: list[Incident]


class DemoSnapshot(BaseModel):
    day: int
    day_label: str
    farm: FarmProfile
    incident: CurrentIncident
    rover: RoverEvidence
    agent_state: str
    agent_steps: list[AgentStep]
    retrieval: MemoryRetrieval
    memory: MemoryResponse
    chat: list[dict[str, str]]


class MemorySearchRequest(BaseModel):
    day: int = Field(ge=1, le=60)
    query: str = "brown spots tomato leaves high humidity"


class MemorySearchResponse(BaseModel):
    mode: Literal["demo", "real"]
    found: int
    incidents: list[Incident]
    message: str


class MemorySaveRequest(BaseModel):
    day: int = Field(ge=1, le=60)
    outcome: str = "Condition improved after treatment"
    expert_validated: bool = True


class MemorySaveResponse(BaseModel):
    saved: bool
    mode: Literal["demo", "real"]
    incident_id: str
    message: str


class HealthResponse(BaseModel):
    service: str
    mode: Literal["demo", "real"]
    connected: bool
    message: str