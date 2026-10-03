from fastapi import APIRouter
from app.state_store import app_state
from app.services.packet_service import generate_packet
from app.communication.esp32_client import esp32_client
from app.models.state_models import Esp32Config

router = APIRouter(prefix="/api/esp32", tags=["ESP32"])

@router.get("/packet")
def get_current_packet():
    return generate_packet(app_state)

@router.post("/send")
async def send_packet():
    packet = generate_packet(app_state)
    response = await esp32_client.send_packet(app_state, packet)
    return {
        "success": response is not None,
        "packet": packet,
        "response": response,
        "status": app_state.communication.status
    }

@router.get("/status")
def get_status():
    return app_state.communication

@router.post("/config")
def set_config(config: Esp32Config):
    app_state.communication.config = config
    return {"success": True, "config": config}
