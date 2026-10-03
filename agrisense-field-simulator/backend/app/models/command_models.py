from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from .state_models import ScenarioType, SimulationMode, Esp32Config

class EnvironmentCommand(BaseModel):
    rainfall_mm: Optional[float] = Field(None, ge=0)
    zone_temperatures: Optional[Dict[str, float]] = None
    zone_flows: Optional[Dict[str, float]] = None

class ScenarioCommand(BaseModel):
    target_zone: str
    target_sensor: str
    scenario_type: ScenarioType
    parameters: Dict[str, Any] = {}
    duration_updates: Optional[int] = None

class SimulationConfigCommand(BaseModel):
    mode: SimulationMode
    interval_ms: int = Field(1000, ge=100)
