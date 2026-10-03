from fastapi import APIRouter
from app.state_store import app_state
from app.models.state_models import Esp32Config
import datetime

router = APIRouter(prefix="/api/serial", tags=["Serial"])

@router.get("/status")
def get_serial_status():
    comm = app_state.communication
    return {
        "status": comm.status,
        "port": comm.config.host,
        "baudrate": comm.config.port,
        "last_error": comm.last_error,
        "last_transmission_time": datetime.datetime.now().isoformat() if comm.status == "CONNECTED" else None
    }

@router.post("/config")
def set_serial_config(config: Esp32Config):
    app_state.communication.config = config
    return {"success": True, "config": config}
