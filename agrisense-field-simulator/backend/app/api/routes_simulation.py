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
                
    if cmd.zone_moisture:
        for z_id, moisture in cmd.zone_moisture.items():
            if z_id in app_state.simulation.zones:
                for sensor in app_state.simulation.zones[z_id].sensors.values():
                    sensor.ground_truth_moisture = moisture
                    
    if cmd.sensor_moisture:
        for s_id, moisture in cmd.sensor_moisture.items():
            for z_id, zone in app_state.simulation.zones.items():
                if s_id in zone.sensors:
                    zone.sensors[s_id].ground_truth_moisture = moisture

    if cmd.sensor_adc:
        for s_id, adc_val in cmd.sensor_adc.items():
            for z_id, zone in app_state.simulation.zones.items():
                if s_id in zone.sensors:
                    from app.simulation.engine import adc_to_moisture
                    zone.sensors[s_id].adc_value = max(0, min(4095, adc_val))
                    zone.sensors[s_id].ground_truth_moisture = adc_to_moisture(adc_val)
                    zone.sensors[s_id].observed_moisture = adc_to_moisture(adc_val)
                
    return {"success": True, "simulation": app_state.simulation}

@router.post("/config")
def set_config(cmd: SimulationConfigCommand):
    app_state.mode = cmd.mode
    app_state.interval_ms = cmd.interval_ms
    return {"success": True, "mode": app_state.mode, "interval_ms": app_state.interval_ms}
