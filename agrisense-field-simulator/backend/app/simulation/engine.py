import random
from app.models.state_models import ApplicationState, ActiveScenario, ScenarioType
from typing import Dict

def update_environment(state: ApplicationState):
    """Update global environmental aspects, if any dynamic logic is needed."""
    pass

def update_ground_truth(state: ApplicationState):
    """
    Moisture(t+1) = Moisture(t) + rain + irrigation - evaporation - drainage + noise
    """
    sim = state.simulation
    for zone in sim.zones.values():
        for sensor in zone.sensors.values():
            rain_contrib = sim.rainfall_mm * 0.1
            irrigation_contrib = zone.flow_lpm * 0.5
            evap = (zone.temperature_c / 100.0) * 0.2  # simple evap
            drainage = 0.05
            noise = random.uniform(-0.5, 0.5)
            
            new_moisture = sensor.ground_truth_moisture + rain_contrib + irrigation_contrib - evap - drainage + noise
            # Clamp to 0-100
            sensor.ground_truth_moisture = max(0.0, min(100.0, new_moisture))

def generate_normal_observations(state: ApplicationState):
    """Generate default observations based on ground truth with slight noise."""
    for zone in state.simulation.zones.values():
        for sensor in zone.sensors.values():
            # Base normal observation is ground truth + small natural variance
            noise = random.uniform(-1.0, 1.0)
            obs = sensor.ground_truth_moisture + noise
            sensor.observed_moisture = max(0.0, min(100.0, obs))

def apply_active_scenarios(state: ApplicationState):
    """Apply injected faults/scenarios to observations only."""
    sim = state.simulation
    scenarios = list(state.scenario.active_scenarios.values())
    
    for active in scenarios:
        zone_id = active.target_zone
        sensor_id = active.target_sensor
        
        # Ensure target exists
        if zone_id not in sim.zones or sensor_id not in sim.zones[zone_id].sensors:
            continue
            
        sensor = sim.zones[zone_id].sensors[sensor_id]
        
        if active.scenario_type == ScenarioType.NORMAL:
            pass # Already normal
            
        elif active.scenario_type == ScenarioType.OUTLIER:
            val = active.parameters.get("value", 90.0)
            sensor.observed_moisture = float(val)
            
        elif active.scenario_type == ScenarioType.SUDDEN_JUMP:
            jump = active.parameters.get("jump_value", 40.0)
            sensor.observed_moisture += float(jump)
            
        elif active.scenario_type == ScenarioType.STUCK:
            # Capture stuck value first time
            if "stuck_value" not in active.internal_state:
                active.internal_state["stuck_value"] = sensor.observed_moisture
            sensor.observed_moisture = active.internal_state["stuck_value"]
            
        elif active.scenario_type == ScenarioType.DRIFT:
            if "accumulated_drift" not in active.internal_state:
                active.internal_state["accumulated_drift"] = 0.0
            drift_rate = active.parameters.get("rate", 1.0)
            active.internal_state["accumulated_drift"] += float(drift_rate)
            sensor.observed_moisture += active.internal_state["accumulated_drift"]
            
        elif active.scenario_type == ScenarioType.MISSING:
            # MISSING doesn't change the value here; it affects packet generation
            pass
            
        elif active.scenario_type == ScenarioType.NOISE:
            amplitude = active.parameters.get("amplitude", 5.0)
            noise = random.uniform(-float(amplitude), float(amplitude))
            sensor.observed_moisture += noise
            
        elif active.scenario_type == ScenarioType.BIAS:
            bias = active.parameters.get("bias", 10.0)
            sensor.observed_moisture += float(bias)

def clamp_and_validate(state: ApplicationState):
    """Ensure all observations remain within valid bounds after scenarios."""
    for zone in state.simulation.zones.values():
        for sensor in zone.sensors.values():
            sensor.observed_moisture = max(0.0, min(100.0, sensor.observed_moisture))
            
def cleanup_scenarios(state: ApplicationState):
    """Remove scenarios that have exceeded their duration."""
    sim = state.simulation
    to_remove = []
    for sid, active in state.scenario.active_scenarios.items():
        if active.duration_updates is not None:
            elapsed = sim.update_counter - active.start_time
            if elapsed >= active.duration_updates:
                to_remove.append(sid)
                
    for sid in to_remove:
        del state.scenario.active_scenarios[sid]

def step_simulation(state: ApplicationState):
    """Perform exactly ONE simulation update."""
    update_environment(state)
    update_ground_truth(state)
    generate_normal_observations(state)
    apply_active_scenarios(state)
    clamp_and_validate(state)
    
    state.simulation.update_counter += 1
    state.simulation.simulation_time += 1
    
    cleanup_scenarios(state)
