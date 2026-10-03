from pydantic import BaseModel, Field
from typing import List

class SensorReading(BaseModel):
    sensor_id: str
    moisture_percent: float = Field(ge=0, le=100)

class ZoneData(BaseModel):
    zone_id: str
    temperature_c: float
    flow_lpm: float = Field(ge=0)
    sensors: List[SensorReading]

class SimulationPacket(BaseModel):
    timestamp: int
    rainfall_mm: float = Field(ge=0)
    zones: List[ZoneData]
