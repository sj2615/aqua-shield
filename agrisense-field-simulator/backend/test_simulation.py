import pytest
from app.simulation.state import create_initial_state
from app.simulation.engine import step_simulation
from app.models.state_models import ScenarioType, ActiveScenario
from app.services.packet_service import generate_packet

def test_initial_state():
    state = create_initial_state()
    assert len(state.simulation.zones) == 4
    assert state.simulation.zones["Z01"].sensors["S01"].ground_truth_moisture == 50.0

def test_outlier_scenario():
    state = create_initial_state()
    
    # Verify normal observation is roughly equal to ground truth
    step_simulation(state)
    sensor = state.simulation.zones["Z01"].sensors["S03"]
    assert abs(sensor.observed_moisture - sensor.ground_truth_moisture) <= 1.0
    
    # Apply outlier to Z01/S03
    state.scenario.active_scenarios["S03"] = ActiveScenario(
        scenario_type=ScenarioType.OUTLIER,
        target_zone="Z01",
        target_sensor="S03",
        parameters={"value": 90.0},
        start_time=state.simulation.update_counter
    )
    
    step_simulation(state)
    
    sensor = state.simulation.zones["Z01"].sensors["S03"]
    # Ground truth should remain near 50 (with small noise)
    assert 48.0 <= sensor.ground_truth_moisture <= 52.0
    # Observed moisture should be exactly 90.0 (the outlier value)
    assert sensor.observed_moisture == 90.0
    
    # Verify packet generation
    packet = generate_packet(state)
    z01_packet = next(z for z in packet.zones if z.zone_id == "Z01")
    s03_packet = next(s for s in z01_packet.sensors if s.sensor_id == "S03")
    
    assert s03_packet.moisture_percent == 90.0
    assert not hasattr(s03_packet, "fault")

def test_missing_scenario():
    state = create_initial_state()
    state.scenario.active_scenarios["S07"] = ActiveScenario(
        scenario_type=ScenarioType.MISSING,
        target_zone="Z03",
        target_sensor="S07",
        start_time=state.simulation.update_counter
    )
    
    step_simulation(state)
    packet = generate_packet(state)
    
    z03_packet = next(z for z in packet.zones if z.zone_id == "Z03")
    s07_packet = next((s for s in z03_packet.sensors if s.sensor_id == "S07"), None)
    
    assert s07_packet is None
