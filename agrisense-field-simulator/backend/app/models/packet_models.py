from pydantic import BaseModel, Field
from typing import List, Optional

class SensorReading(BaseModel):
    sensor_id: str
    adc_value: int = Field(ge=0, le=4095)       # Raw ESP32 analogRead()
    moisture_percent: float = Field(ge=0, le=100) # Derived from ADC for display

class ZoneData(BaseModel):
    zone_id: str
    temperature_c: float
    flow_lpm: float = Field(ge=0)
    sensors: List[SensorReading]

class SimulationPacket(BaseModel):
    timestamp: int
    rainfall_mm: float = Field(ge=0)
    zones: List[ZoneData]
