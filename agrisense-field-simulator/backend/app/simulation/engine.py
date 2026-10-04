import random
from app.models.state_models import ApplicationState, ScenarioType

# ─── ADC ↔ Moisture Conversion ───────────────────────────────────────────────
# Hardware mapping (inverted — drier = higher ADC):
#   3800 = 0%  (very dry)
#   3200 = 20%
#   2700 = 40%
#   2100 = 60%
#   1400 = 80%
#    800 = 100% (very wet)

ADC_DRY = 3800   # corresponds to 0% moisture
ADC_WET = 800    # corresponds to 100% moisture

def adc_to_moisture(adc: int) -> float:
    """Convert raw ESP32 ADC value to moisture percentage (0-100)."""
    pct = (ADC_DRY - adc) / (ADC_DRY - ADC_WET) * 100.0
    return round(max(0.0, min(100.0, pct)), 2)

def moisture_to_adc(moisture_pct: float) -> int:
    """Convert moisture percentage to raw ADC value."""
    adc = ADC_DRY - (moisture_pct / 100.0) * (ADC_DRY - ADC_WET)
    return max(0, min(4095, int(round(adc))))


# ─── Environment Step ────────────────────────────────────────────────────────

def update_environment(state: ApplicationState):
    """Drift rainfall and flow; update temperature from those conditions."""
    if state.mode.value == "PAUSED":
        return
    sim = state.simulation

    sim.rainfall_mm += random.uniform(-1.0, 1.0)
    sim.rainfall_mm = max(0.0, min(50.0, sim.rainfall_mm))

    for zone in sim.zones.values():
        zone.flow_lpm += random.uniform(-0.5, 0.5)
        zone.flow_lpm = max(0.0, min(20.0, zone.flow_lpm))

        cooling = (sim.rainfall_mm * 0.05) + (zone.flow_lpm * 0.1)
        heating = 0.15
        zone.temperature_c += (heating - cooling) + random.uniform(-0.1, 0.1)
        zone.temperature_c = max(27.0, min(42.0, zone.temperature_c))


# ─── ADC Ground-Truth Step ───────────────────────────────────────────────────

def update_ground_truth(state: ApplicationState):
    """
    Update raw ADC value for each sensor based on environmental conditions.

    Physics (ADC units, inverted — lower ADC = wetter):
      rain & irrigation → DECREASE ADC (soil gets wetter)
      evaporation / heat → INCREASE ADC (soil gets drier)

    Then derive ground_truth_moisture from the resulting ADC.
    """
    if state.mode.value == "PAUSED":
        return
    sim = state.simulation

    for zone in sim.zones.values():
        for sensor in zone.sensors.values():
            # Rain and irrigation decrease ADC (wetter)
            rain_effect  = -(sim.rainfall_mm * 1.5)
            irrig_effect = -(zone.flow_lpm * 3.0)

            # Heat/evaporation increases ADC (drier)
            evap_effect  = (zone.temperature_c / 42.0) * 12.0

            noise = random.uniform(-5, 5)

            new_adc = sensor.adc_value + rain_effect + irrig_effect + evap_effect + noise
            # Clamp to realistic sensor range (800 – 3800)
            sensor.adc_value = max(800, min(3800, int(round(new_adc))))

            # Derive moisture percentage from ADC
            sensor.ground_truth_moisture = adc_to_moisture(sensor.adc_value)


# ─── Observation Step ────────────────────────────────────────────────────────

def generate_normal_observations(state: ApplicationState):
    """Copy ground truth to observed, adding a tiny ADC-level noise in LIVE mode."""
    for zone in state.simulation.zones.values():
        for sensor in zone.sensors.values():
            if state.mode.value == "LIVE":
                noisy_adc = sensor.adc_value + random.randint(-10, 10)
                noisy_adc = max(800, min(3800, noisy_adc))
                sensor.observed_moisture = adc_to_moisture(noisy_adc)
            else:
                sensor.observed_moisture = sensor.ground_truth_moisture


# ─── Fault Injection ─────────────────────────────────────────────────────────

def apply_active_scenarios(state: ApplicationState):
    """Apply injected faults/scenarios to observations only."""
    sim = state.simulation

    for active in list(state.scenario.active_scenarios.values()):
        zone_id   = active.target_zone
        sensor_id = active.target_sensor

        if zone_id not in sim.zones:
            continue

        # ── Temperature faults ──────────────────────────────────
        if sensor_id.startswith('T'):
            zone = sim.zones[zone_id]
            if active.scenario_type == ScenarioType.OUTLIER:
                zone.temperature_c = float(active.parameters.get("value", 45.0))
            elif active.scenario_type == ScenarioType.SUDDEN_JUMP:
                zone.temperature_c += float(active.parameters.get("jump_value", 10.0))
            elif active.scenario_type == ScenarioType.STUCK:
                if "stuck_value" not in active.internal_state:
                    active.internal_state["stuck_value"] = zone.temperature_c
                zone.temperature_c = active.internal_state["stuck_value"]
            elif active.scenario_type == ScenarioType.DRIFT:
                if "accumulated_drift" not in active.internal_state:
                    active.internal_state["accumulated_drift"] = 0.0
                active.internal_state["accumulated_drift"] += float(active.parameters.get("rate", 0.5))
                zone.temperature_c += active.internal_state["accumulated_drift"]
            elif active.scenario_type == ScenarioType.NOISE:
                amp = float(active.parameters.get("amplitude", 2.0))
                zone.temperature_c += random.uniform(-amp, amp)
            elif active.scenario_type == ScenarioType.BIAS:
                zone.temperature_c += float(active.parameters.get("bias", 5.0))
            continue

        # ── Moisture/ADC faults ─────────────────────────────────
        if sensor_id not in sim.zones[zone_id].sensors:
            continue

        sensor = sim.zones[zone_id].sensors[sensor_id]

        if active.scenario_type == ScenarioType.OUTLIER:
            sensor.observed_moisture = float(active.parameters.get("value", 90.0))

        elif active.scenario_type == ScenarioType.SUDDEN_JUMP:
            sensor.observed_moisture += float(active.parameters.get("jump_value", 40.0))

        elif active.scenario_type == ScenarioType.STUCK:
            if "stuck_value" not in active.internal_state:
                active.internal_state["stuck_value"] = sensor.observed_moisture
            sensor.observed_moisture = active.internal_state["stuck_value"]

        elif active.scenario_type == ScenarioType.DRIFT:
            if "accumulated_drift" not in active.internal_state:
                active.internal_state["accumulated_drift"] = 0.0
            active.internal_state["accumulated_drift"] += float(active.parameters.get("rate", 1.0))
            sensor.observed_moisture += active.internal_state["accumulated_drift"]

        elif active.scenario_type == ScenarioType.MISSING:
            pass  # Handled at packet generation

        elif active.scenario_type == ScenarioType.NOISE:
            amp = float(active.parameters.get("amplitude", 5.0))
            sensor.observed_moisture += random.uniform(-amp, amp)

        elif active.scenario_type == ScenarioType.BIAS:
            sensor.observed_moisture += float(active.parameters.get("bias", 10.0))


# ─── Clamping & Cleanup ──────────────────────────────────────────────────────

def clamp_and_validate(state: ApplicationState):
    """Ensure all values are in valid bounds."""
    for zone in state.simulation.zones.values():
        for sensor in zone.sensors.values():
            sensor.observed_moisture = max(0.0, min(100.0, sensor.observed_moisture))
            sensor.adc_value = max(0, min(4095, sensor.adc_value))


def cleanup_scenarios(state: ApplicationState):
    """Remove scenarios that have exceeded their duration."""
    sim = state.simulation
    to_remove = [
        sid for sid, active in state.scenario.active_scenarios.items()
        if active.duration_updates is not None
        and (sim.update_counter - active.start_time) >= active.duration_updates
    ]
    for sid in to_remove:
        del state.scenario.active_scenarios[sid]


# ─── Main Step ───────────────────────────────────────────────────────────────

def step_simulation(state: ApplicationState):
    """Perform exactly ONE simulation update tick."""
    update_environment(state)
    update_ground_truth(state)
    generate_normal_observations(state)
    apply_active_scenarios(state)
    clamp_and_validate(state)

    state.simulation.update_counter += 1
    state.simulation.simulation_time += 1

    cleanup_scenarios(state)
