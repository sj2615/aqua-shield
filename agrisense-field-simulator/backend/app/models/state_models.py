from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum

class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    OUTLIER = "OUTLIER"
    SUDDEN_JUMP = "SUDDEN_JUMP"
    STUCK = "STUCK"
    DRIFT = "DRIFT"
    MISSING = "MISSING"
    NOISE = "NOISE"
    BIAS = "BIAS"

class SensorState(BaseModel):
    sensor_id: str
    adc_value: int = Field(ge=0, le=4095, default=2300)          # Raw ESP32 analogRead()
    ground_truth_moisture: float = Field(ge=0, le=100, exclude=True)
    observed_moisture: float = Field(ge=0, le=100)
    sensor_bias: float = Field(default=0.0, exclude=True)

class ZoneState(BaseModel):
    zone_id: str
    temperature_c: float
    observed_temperature_c: float = Field(default=27.0, ge=0, le=60)
    temperature_target_c: float = Field(default=27.0, ge=0, le=60)
    flow_lpm: float = Field(ge=0)
    flow_target_lpm: float = Field(default=0.0, ge=0, le=20)
    sensors: Dict[str, SensorState]
    true_moisture: float = Field(default=50.0, ge=0, le=100, exclude=True)
    retention: float = Field(default=0.9, exclude=True)
    drainage_factor: float = Field(default=0.06, exclude=True)
    temperature_offset_c: float = Field(default=0.0, exclude=True)

class SimulationState(BaseModel):
    update_counter: int = 0
    simulation_time: int = 0
    rainfall_mm: float = Field(ge=0, default=0.0)
    rainfall_target_mm: float = Field(default=0.0, ge=0, le=25, exclude=True)
    zones: Dict[str, ZoneState]

class ActiveScenario(BaseModel):
    scenario_type: ScenarioType
    target_zone: str
    target_sensor: str
    parameters: Dict[str, Any] = {}
    start_time: int
    duration_updates: Optional[int] = None
    internal_state: Dict[str, Any] = {}

class ScenarioState(BaseModel):
    active_scenarios: Dict[str, ActiveScenario] = {} # Keyed by sensor_id

class ConnectionStatus(str, Enum):
    CONFIGURED = "CONFIGURED"
    CHECKING = "CHECKING"
    CONNECTED = "CONNECTED"
    UNREACHABLE = "UNREACHABLE"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"

class Esp32Config(BaseModel):
    host: str = "COM5"
    port: int = 115200
    endpoint: str = "/sensor-data"

class CommunicationState(BaseModel):
    config: Esp32Config = Esp32Config()
    status: ConnectionStatus = ConnectionStatus.CONFIGURED
    last_checked: Optional[str] = None
    last_error: Optional[str] = None
    last_request: Optional[Any] = None
    last_response: Optional[Any] = None

class SimulationMode(str, Enum):
    PAUSED = "PAUSED"
    MANUAL = "MANUAL"
    LIVE = "LIVE"

class ApplicationState(BaseModel):
    simulation: SimulationState
    scenario: ScenarioState
    communication: CommunicationState
    mode: SimulationMode = SimulationMode.PAUSED
    interval_ms: int = 1000
