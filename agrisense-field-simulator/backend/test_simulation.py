import pytest
from app.simulation.state import create_initial_state
from app.simulation.engine import step_simulation
from app.models.state_models import ScenarioType, ActiveScenario, SimulationMode
from app.services.packet_service import generate_packet

def test_initial_state():
    state = create_initial_state()
    assert len(state.simulation.zones) == 4
    assert state.simulation.zones["Z01"].true_moisture == 52.0
    assert [len(z.sensors) for z in state.simulation.zones.values()] == [3, 3, 3, 3]

def test_water_balance_and_sensor_correlation():
    state = create_initial_state()
    state.mode = SimulationMode.LIVE
    zone = state.simulation.zones["Z01"]
    zone.temperature_c = 25
    zone.flow_lpm = 0
    state.simulation.rainfall_mm = 0
    before = zone.true_moisture
    step_simulation(state)
    assert zone.true_moisture < before
    readings = [s.observed_moisture for s in zone.sensors.values()]
    assert max(readings) - min(readings) < 2.0

def test_rain_and_irrigation_increase_true_moisture():
    state = create_initial_state()
    state.mode = SimulationMode.LIVE
    zone = state.simulation.zones["Z01"]
    zone.temperature_c = 20
    state.simulation.rainfall_mm = 10
    before = zone.true_moisture
    step_simulation(state)
    assert zone.true_moisture > before

def test_dynamic_environment_and_field_stay_zone_specific_over_30_ticks():
    state = create_initial_state()
    state.mode = SimulationMode.LIVE
    z01 = state.simulation.zones["Z01"]
    z02 = state.simulation.zones["Z02"]
    start_temp = z01.temperature_c
    start_moisture = z01.true_moisture

    # No irrigation target means no flow drift over a long run.
    for _ in range(30):
        step_simulation(state)
    assert z01.flow_lpm == 0
    assert abs(z01.temperature_c - start_temp) < 2.0
    assert z01.temperature_c != start_temp
    assert z01.temperature_c != z02.temperature_c
    assert z01.true_moisture < start_moisture
    for zone in state.simulation.zones.values():
        readings = [sensor.observed_moisture for sensor in zone.sensors.values()]
        assert max(readings) - min(readings) < 2.0

    # Rain is a decaying global event and raises the hidden field first.
    state.simulation.rainfall_target_mm = 4.5
    before_rain = z01.true_moisture
    for _ in range(8):
        step_simulation(state)
    assert z01.true_moisture > before_rain
    assert state.simulation.rainfall_mm < 4.5

    # Flow changes only after an irrigation target is set, then eases toward it.
    z01.flow_target_lpm = 20
    step_simulation(state)
    first_flow = z01.flow_lpm
    assert 0 < first_flow < 20
    before_irrigation = z01.true_moisture
    for _ in range(8):
        step_simulation(state)
    assert z01.flow_lpm > first_flow
    assert z01.true_moisture > before_irrigation
    z01.flow_target_lpm = 0
    for _ in range(30):
        step_simulation(state)
    assert z01.flow_lpm < 0.05
    state.simulation.rainfall_mm = 0
    zone.flow_lpm = 20
    before = zone.true_moisture
    step_simulation(state)
    assert zone.true_moisture > before

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
