from app.models.state_models import ApplicationState, ScenarioType
from app.models.packet_models import SimulationPacket, ZoneData, SensorReading

def generate_packet(state: ApplicationState) -> SimulationPacket:
    sim = state.simulation
    scenario = state.scenario
    
    zones_data = []
    
    for zone_id, zone_state in sim.zones.items():
        sensors_data = []
        for sensor_id, sensor_state in zone_state.sensors.items():
            # Check if this sensor has a MISSING scenario
            active = scenario.active_scenarios.get(sensor_id)
            if active and active.scenario_type == ScenarioType.MISSING:
                # Omit this sensor from the packet
                continue
                
            sensors_data.append(SensorReading(
                sensor_id=sensor_id,
                moisture_percent=round(sensor_state.observed_moisture, 2)
            ))
            
        zones_data.append(ZoneData(
            zone_id=zone_id,
            temperature_c=zone_state.temperature_c,
            flow_lpm=zone_state.flow_lpm,
            sensors=sensors_data
        ))
        
    packet = SimulationPacket(
        timestamp=sim.simulation_time,
        rainfall_mm=sim.rainfall_mm,
        zones=zones_data
    )
    
    return packet
