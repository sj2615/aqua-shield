from fastapi import APIRouter
from app.state_store import app_state, reset_state
from app.simulation.engine import step_simulation
from app.services.packet_service import generate_packet
from app.models.command_models import EnvironmentCommand, SimulationConfigCommand

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

@router.get("/state")
def get_state():
    return app_state

@router.post("/step")
def step():
    step_simulation(app_state)
    packet = generate_packet(app_state)
    return {
        "success": True,
        "update_counter": app_state.simulation.update_counter,
        "packet": packet
    }

@router.post("/reset")
def reset():
    reset_state()
    return {"success": True}

@router.post("/environment")
def update_environment(cmd: EnvironmentCommand):
    if cmd.rainfall_mm is not None:
        app_state.simulation.rainfall_mm = cmd.rainfall_mm
    
    if cmd.zone_temperatures:
        for z_id, temp in cmd.zone_temperatures.items():
            if z_id in app_state.simulation.zones:
                app_state.simulation.zones[z_id].temperature_c = temp
                
    if cmd.zone_flows:
        for z_id, flow in cmd.zone_flows.items():
            if z_id in app_state.simulation.zones:
                app_state.simulation.zones[z_id].flow_lpm = flow
                
    return {"success": True, "simulation": app_state.simulation}

@router.post("/config")
def set_config(cmd: SimulationConfigCommand):
    app_state.mode = cmd.mode
    app_state.interval_ms = cmd.interval_ms
    return {"success": True, "mode": app_state.mode, "interval_ms": app_state.interval_ms}
