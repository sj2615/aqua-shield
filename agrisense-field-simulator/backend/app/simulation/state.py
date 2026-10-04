from app.models.state_models import (
    SimulationState, ZoneState, SensorState, ScenarioState,
    CommunicationState, ApplicationState, SimulationMode
)
import random

def adc_to_moisture(adc: int) -> float:
    return round(max(0.0, min(100.0, (3800 - adc) / (3800 - 800) * 100.0)), 2)

def create_initial_state() -> ApplicationState:
    zones = {}
    profiles = ((52.0, 0.90, 0.06, -1.0), (44.0, 0.82, 0.10, 1.5), (61.0, 0.94, 0.04, -2.0), (38.0, 0.76, 0.12, 2.5))
    for z in range(1, 5):
        zone_id = f"Z0{z}"
        sensors = {}
        for s in range(1, 4):
            sensor_idx = (z - 1) * 3 + s
            sensor_id = f"S{sensor_idx:02d}"
            initial_moisture = profiles[z - 1][0]
            initial_adc = int(round(3800 - initial_moisture * 30))
            sensors[sensor_id] = SensorState(
                sensor_id=sensor_id,
                adc_value=initial_adc,
                ground_truth_moisture=initial_moisture,
                observed_moisture=round(initial_moisture + random.uniform(-0.5, 0.5), 2),
                sensor_bias=random.uniform(-0.5, 0.5),
            )
        zones[zone_id] = ZoneState(
            zone_id=zone_id,
            temperature_c=26.0 + profiles[z - 1][3],
            observed_temperature_c=26.0 + profiles[z - 1][3],
            temperature_target_c=26.0 + profiles[z - 1][3],
            flow_lpm=0.0,
            sensors=sensors,
            true_moisture=profiles[z - 1][0],
            retention=profiles[z - 1][1],
            drainage_factor=profiles[z - 1][2],
            temperature_offset_c=profiles[z - 1][3],
        )
        
    return ApplicationState(
        simulation=SimulationState(
            update_counter=0,
            simulation_time=0,
            rainfall_mm=0.0,
            zones=zones
        ),
        scenario=ScenarioState(),
        communication=CommunicationState(),
        mode=SimulationMode.PAUSED,
        interval_ms=1000
    )
