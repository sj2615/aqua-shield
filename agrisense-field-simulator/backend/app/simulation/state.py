from app.models.state_models import (
    SimulationState, ZoneState, SensorState, ScenarioState,
    CommunicationState, ApplicationState, SimulationMode
)

def adc_to_moisture(adc: int) -> float:
    return round(max(0.0, min(100.0, (3800 - adc) / (3800 - 800) * 100.0)), 2)

def create_initial_state() -> ApplicationState:
    zones = {}
    for z in range(1, 5):
        zone_id = f"Z0{z}"
        sensors = {}
        for s in range(1, 4):
            sensor_idx = (z - 1) * 3 + s
            sensor_id = f"S{sensor_idx:02d}"
            initial_adc = 2300  # moderate soil moisture (~50%)
            initial_moisture = adc_to_moisture(initial_adc)
            sensors[sensor_id] = SensorState(
                sensor_id=sensor_id,
                adc_value=initial_adc,
                ground_truth_moisture=initial_moisture,
                observed_moisture=initial_moisture
            )
        zones[zone_id] = ZoneState(
            zone_id=zone_id,
            temperature_c=25.0,
            flow_lpm=0.0,
            sensors=sensors
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
