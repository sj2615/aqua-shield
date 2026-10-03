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
    ground_truth_moisture: float = Field(ge=0, le=100)
    observed_moisture: float = Field(ge=0, le=100)

class ZoneState(BaseModel):
    zone_id: str
    temperature_c: float
    flow_lpm: float = Field(ge=0)
    sensors: Dict[str, SensorState]

class SimulationState(BaseModel):
    update_counter: int = 0
    simulation_time: int = 0
    rainfall_mm: float = Field(ge=0, default=0.0)
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
