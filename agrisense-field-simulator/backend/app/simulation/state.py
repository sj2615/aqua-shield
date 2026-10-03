from app.models.state_models import (
    SimulationState, ZoneState, SensorState, ScenarioState, 
    CommunicationState, ApplicationState, SimulationMode
)

def create_initial_state() -> ApplicationState:
    zones = {}
    for z in range(1, 5):
        zone_id = f"Z0{z}"
        sensors = {}
        for s in range(1, 4):
            sensor_idx = (z - 1) * 3 + s
            sensor_id = f"S{sensor_idx:02d}"
            sensors[sensor_id] = SensorState(
                sensor_id=sensor_id,
                ground_truth_moisture=50.0,
                observed_moisture=50.0
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
