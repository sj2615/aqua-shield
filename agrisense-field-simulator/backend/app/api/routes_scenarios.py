from fastapi import APIRouter, HTTPException
from app.state_store import app_state
from app.models.command_models import ScenarioCommand
from app.models.state_models import ActiveScenario
import time

router = APIRouter(prefix="/api/scenario", tags=["Scenarios"])

@router.post("/apply")
def apply_scenario(cmd: ScenarioCommand):
    zone_id = cmd.target_zone
    sensor_id = cmd.target_sensor
    
    if zone_id not in app_state.simulation.zones:
        raise HTTPException(status_code=400, detail="Invalid zone ID")
    if sensor_id not in app_state.simulation.zones[zone_id].sensors:
        raise HTTPException(status_code=400, detail="Invalid sensor ID")
        
    active = ActiveScenario(
        scenario_type=cmd.scenario_type,
        target_zone=zone_id,
        target_sensor=sensor_id,
        parameters=cmd.parameters,
        start_time=app_state.simulation.update_counter,
        duration_updates=cmd.duration_updates
    )
    
    app_state.scenario.active_scenarios[sensor_id] = active
    return {"success": True, "scenario": active}

@router.post("/reset")
def reset_scenario(target_sensor: str):
    if target_sensor in app_state.scenario.active_scenarios:
        del app_state.scenario.active_scenarios[target_sensor]
    return {"success": True}
