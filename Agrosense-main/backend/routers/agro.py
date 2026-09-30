from fastapi import APIRouter, HTTPException, Query

from memory import memory
from models.agro import (
    DemoSnapshot,
    FarmProfile,
    HealthResponse,
    MemoryResponse,
    MemorySaveRequest,
    MemorySaveResponse,
    MemorySearchRequest,
    MemorySearchResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        service="agrosense-agent",
        mode="demo",
        connected=False,
        message="Demo memory active — not connected to real Hindsight",
    )


@router.get("/farm", response_model=FarmProfile)
async def get_farm() -> FarmProfile:
    return memory._farm()


@router.get("/memory", response_model=MemoryResponse)
async def get_memory(day: int = Query(1, ge=1, le=60)) -> MemoryResponse:
    return memory.get_snapshot(day).memory


@router.post("/memory/search", response_model=MemorySearchResponse)
async def search_memory(request: MemorySearchRequest) -> MemorySearchResponse:
    incidents, message = memory.search_memory(request.day)
    return MemorySearchResponse(mode="demo", found=len(incidents), incidents=incidents, message=message)


@router.post("/memory/save", response_model=MemorySaveResponse)
async def save_memory(request: MemorySaveRequest) -> MemorySaveResponse:
    if not request.expert_validated:
        raise HTTPException(status_code=400, detail="Expert validation is required before saving an outcome")
    return memory.save_incident(request.day, request.outcome, request.expert_validated)


@router.get("/demo/day/{day}", response_model=DemoSnapshot)
async def get_demo_day(day: int) -> DemoSnapshot:
    if day not in {1, 30, 60}:
        raise HTTPException(status_code=404, detail="Demo supports Day 1, Day 30 and Day 60")
    return memory.get_snapshot(day)


@router.post("/demo/reset", response_model=DemoSnapshot)
async def reset_demo() -> DemoSnapshot:
    memory.saved_incidents.clear()
    return memory.get_snapshot(1)