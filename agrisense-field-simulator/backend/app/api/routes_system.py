from fastapi import APIRouter
from app.state_store import app_state

router = APIRouter(tags=["System"])

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "agrisense-backend"}

@router.get("/api/system/status")
def system_status():
    return {
        "backend_status": "ok",
        "simulation_mode": app_state.mode,
        "update_counter": app_state.simulation.update_counter,
        "esp32_status": app_state.communication.status
    }
