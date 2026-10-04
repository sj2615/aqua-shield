import math
import random
from app.models.state_models import ApplicationState, ScenarioType

ADC_DRY = 3800
ADC_WET = 800
RAIN_ABSORPTION = 0.35
BASE_EVAPORATION = 0.08
IRRIGATION_COEFFICIENT = 0.025
PLANT_WATER_USE = 0.10
MAX_NORMAL_MOISTURE_CHANGE = 1.5


def _safe(value: float, fallback: float, low: float, high: float) -> float:
    try:
        value = float(value)
        return max(low, min(high, value)) if math.isfinite(value) else fallback
    except (TypeError, ValueError):
        return fallback


def adc_to_moisture(adc: int) -> float:
    pct = (ADC_DRY - _safe(adc, ADC_DRY, ADC_WET, ADC_DRY)) / (ADC_DRY - ADC_WET) * 100.0
    return round(max(0.0, min(100.0, pct)), 2)


def moisture_to_adc(moisture_pct: float) -> int:
    moisture_pct = _safe(moisture_pct, 50.0, 0, 100)
    return int(round(ADC_DRY - (moisture_pct / 100.0) * (ADC_DRY - ADC_WET)))


def _gaussian_noise(std_dev: float = 0.25) -> float:
    # Box-Muller; avoid log(0).
    u1 = max(random.random(), 1e-12)
    u2 = random.random()
    return std_dev * math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def update_environment(state: ApplicationState):
    sim = state.simulation
    sim.rainfall_mm = _safe(sim.rainfall_mm, 0, 0, 25)
    sim.rainfall_target_mm = _safe(sim.rainfall_target_mm, 0, 0, 25)
    sim.rainfall_mm += (sim.rainfall_target_mm - sim.rainfall_mm) * 0.5
    if sim.rainfall_target_mm > 0 and abs(sim.rainfall_mm - sim.rainfall_target_mm) < 0.25:
        # A preset starts a short rainfall event; after its smooth rise, let it decay.
        sim.rainfall_target_mm = 0.0
    for zone in sim.zones.values():
        zone.flow_lpm = _safe(zone.flow_lpm, 0, 0, 20)
        zone.temperature_c = _safe(zone.temperature_c, 25, 0, 60)
        zone.flow_target_lpm = _safe(zone.flow_target_lpm, 0, 0, 20)
        zone.temperature_target_c = _safe(zone.temperature_target_c, zone.temperature_c, 0, 60)

        # Persistent zone setpoints plus a slow shared daily-style cycle.
        cycle = 1.5 * math.sin((sim.simulation_time / 120.0) * 2.0 * math.pi)
        target_temperature = _safe(zone.temperature_target_c + cycle, zone.temperature_c, 0, 60)
        zone.temperature_c += (target_temperature - zone.temperature_c) * 0.08 + random.uniform(-0.025, 0.025)

        # Flow is an irrigation input, not random weather: it eases toward the
        # operator's persistent target and remains unchanged at zero activity.
        zone.flow_lpm += (zone.flow_target_lpm - zone.flow_lpm) * 0.2


def update_ground_truth(state: ApplicationState):
    sim = state.simulation
    rain = _safe(sim.rainfall_mm, 0, 0, 25) * RAIN_ABSORPTION
    for zone in sim.zones.values():
        old = _safe(zone.true_moisture, 50, 0, 100)
        temp = _safe(zone.temperature_c, 25, 0, 60)
        flow = _safe(zone.flow_lpm, 0, 0, 20)
        rainfall_effect = rain * _safe(zone.retention, 0.9, 0.5, 1.2)
        irrigation_effect = flow * IRRIGATION_COEFFICIENT
        evaporation = BASE_EVAPORATION + max(0.0, temp - 20.0) * 0.012
        plant_use = PLANT_WATER_USE * (1.0 + max(0.0, temp - 20.0) * 0.005)
        drainage_rate = 0.02 if old < 60 else 0.05 if old < 80 else 0.15
        drainage = drainage_rate * _safe(zone.drainage_factor / 0.06, 1.0, 0.5, 2.0)
        change = rainfall_effect + irrigation_effect - evaporation - plant_use - drainage + random.uniform(-0.08, 0.08)
        change = max(-MAX_NORMAL_MOISTURE_CHANGE, min(MAX_NORMAL_MOISTURE_CHANGE, change))
        zone.true_moisture = _safe(old + change, old, 0, 100)
        for sensor in zone.sensors.values():
            sensor.ground_truth_moisture = zone.true_moisture


def generate_normal_observations(state: ApplicationState):
    for zone in state.simulation.zones.values():
        zone.observed_temperature_c = zone.temperature_c + random.uniform(-0.05, 0.05)
        for sensor in zone.sensors.values():
            reading = _safe(zone.true_moisture, 50, 0, 100) + sensor.sensor_bias + _gaussian_noise()
            sensor.observed_moisture = _safe(reading, zone.true_moisture, 0, 100)
            sensor.adc_value = moisture_to_adc(sensor.observed_moisture)


def apply_active_scenarios(state: ApplicationState):
    sim = state.simulation
    for active in list(state.scenario.active_scenarios.values()):
        zone = sim.zones.get(active.target_zone)
        if zone is None:
            continue
        sensor_id = active.target_sensor
        if sensor_id.startswith("T"):
            # Temperature faults alter only the transmitted observation.
            if active.scenario_type == ScenarioType.OUTLIER:
                zone.observed_temperature_c = float(active.parameters.get("value", 45.0))
            elif active.scenario_type == ScenarioType.SUDDEN_JUMP:
                zone.observed_temperature_c += float(active.parameters.get("jump_value", 10.0))
            elif active.scenario_type == ScenarioType.STUCK:
                active.internal_state.setdefault("stuck_value", zone.observed_temperature_c)
                zone.observed_temperature_c = float(active.internal_state["stuck_value"])
            elif active.scenario_type == ScenarioType.DRIFT:
                active.internal_state["accumulated_drift"] = float(active.internal_state.get("accumulated_drift", 0)) + float(active.parameters.get("rate", 0.5))
                zone.observed_temperature_c += active.internal_state["accumulated_drift"]
            elif active.scenario_type == ScenarioType.BIAS:
                zone.observed_temperature_c += float(active.parameters.get("bias", 5.0))
            elif active.scenario_type == ScenarioType.NOISE:
                amp = float(active.parameters.get("amplitude", 2))
                zone.observed_temperature_c += random.uniform(-amp, amp)
            continue
        sensor = zone.sensors.get(sensor_id)
        if sensor is None:
            continue
        fault = active.scenario_type
        params = active.parameters
        if fault == ScenarioType.OUTLIER:
            sensor.observed_moisture = _safe(params.get("value", 90), 90, 0, 100)
            active.internal_state["outlier_applied"] = True
        elif fault == ScenarioType.SUDDEN_JUMP:
            active.internal_state.setdefault("jump_offset", float(params.get("jump_value", 40)))
            sensor.observed_moisture += float(active.internal_state["jump_offset"])
        elif fault == ScenarioType.STUCK:
            active.internal_state.setdefault("stuck_value", sensor.observed_moisture)
            sensor.observed_moisture = float(active.internal_state["stuck_value"])
        elif fault == ScenarioType.DRIFT:
            active.internal_state["accumulated_drift"] = float(active.internal_state.get("accumulated_drift", 0)) + float(params.get("rate", 1))
            sensor.observed_moisture += active.internal_state["accumulated_drift"]
        elif fault == ScenarioType.NOISE:
            amp = float(params.get("amplitude", 5))
            sensor.observed_moisture += random.uniform(-amp, amp)
        elif fault == ScenarioType.BIAS:
            sensor.observed_moisture += float(params.get("bias", 10))


def clamp_and_validate(state: ApplicationState):
    for zone in state.simulation.zones.values():
        zone.true_moisture = _safe(zone.true_moisture, 50, 0, 100)
        zone.temperature_c = _safe(zone.temperature_c, 25, 0, 60)
        zone.observed_temperature_c = _safe(zone.observed_temperature_c, zone.temperature_c, 0, 60)
        zone.flow_lpm = _safe(zone.flow_lpm, 0, 0, 20)
        zone.temperature_target_c = _safe(zone.temperature_target_c, zone.temperature_c, 0, 60)
        zone.flow_target_lpm = _safe(zone.flow_target_lpm, 0, 0, 20)
        for sensor in zone.sensors.values():
            sensor.observed_moisture = _safe(sensor.observed_moisture, zone.true_moisture, 0, 100)
            sensor.ground_truth_moisture = zone.true_moisture
            sensor.adc_value = moisture_to_adc(sensor.observed_moisture)


def cleanup_scenarios(state: ApplicationState):
    sim = state.simulation
    to_remove = []
    for sid, active in state.scenario.active_scenarios.items():
        if active.scenario_type == ScenarioType.OUTLIER and active.internal_state.get("outlier_applied"):
            to_remove.append(sid)
        elif active.duration_updates is not None and sim.update_counter - active.start_time >= active.duration_updates:
            to_remove.append(sid)
    for sid in to_remove:
        del state.scenario.active_scenarios[sid]


def step_simulation(state: ApplicationState):
    update_environment(state)
    update_ground_truth(state)
    generate_normal_observations(state)
    apply_active_scenarios(state)
    clamp_and_validate(state)
    state.simulation.update_counter += 1
    state.simulation.simulation_time += 1
    cleanup_scenarios(state)
