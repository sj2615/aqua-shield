import httpx
import os
import json
import asyncio
import serial
from datetime import datetime
from app.models.state_models import ApplicationState, ConnectionStatus
from app.models.packet_models import SimulationPacket
from concurrent.futures import ThreadPoolExecutor

class ESP32Client:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=5.0)
        self.executor = ThreadPoolExecutor(max_workers=1)

    async def send_packet(self, state: ApplicationState, packet: SimulationPacket):
        mode = os.getenv("ESP32_MODE", "real")
        
        state.communication.last_request = packet.model_dump()
        state.communication.last_checked = datetime.utcnow().isoformat()
        
        if mode.lower() == "mock":
            state.communication.status = ConnectionStatus.CONNECTED
            state.communication.last_error = None
            
            mock_response = {
                "estimated_moisture": packet.zones[0].sensors[0].moisture_percent if packet.zones and packet.zones[0].sensors else 50,
                "confidence": 95,
                "sensor_status": "OK",
                "fault_classification": "NONE",
                "irrigation_decision": "OFF"
            }
            state.communication.last_response = mock_response
            return mock_response
            
        config = state.communication.config
        state.communication.status = ConnectionStatus.CHECKING
        
        # Check if configured for USB Serial
        if config.host.upper().startswith("COM") or config.host.startswith("/dev/"):
            try:
                loop = asyncio.get_event_loop()
                def _sync_serial():
                    baud = config.port if config.port > 1000 else 115200
                    with serial.Serial(config.host, baud, timeout=3.0) as ser:
                        ser.reset_input_buffer()
                        ser.write((packet.model_dump_json() + "\n").encode("utf-8"))
                        ser.flush()
                        return '{"status": "SENT ✓", "message": "Transmitted to ESP32 Serial"}'

                response_text = await loop.run_in_executor(self.executor, _sync_serial)
                
                state.communication.status = ConnectionStatus.CONNECTED
                state.communication.last_error = None
                
                try:
                    state.communication.last_response = json.loads(response_text)
                except json.JSONDecodeError:
                    state.communication.last_response = {"raw": response_text}
                    
                return state.communication.last_response
                
            except serial.SerialException as e:
                state.communication.status = ConnectionStatus.UNREACHABLE
                state.communication.last_error = f"Serial Error: {str(e)}"
                state.communication.last_response = None
                return None
            except Exception as e:
                state.communication.status = ConnectionStatus.ERROR
                state.communication.last_error = str(e)
                state.communication.last_response = None
                return None

        # Fallback to HTTP
        url = f"http://{config.host}:{config.port}{config.endpoint}"
        try:
            response = await self.client.post(url, json=packet.model_dump())
            response.raise_for_status()
            
            state.communication.status = ConnectionStatus.CONNECTED
            state.communication.last_error = None
            
            try:
                state.communication.last_response = response.json()
            except json.JSONDecodeError:
                state.communication.last_response = {"raw": response.text}
                
            return state.communication.last_response
            
        except httpx.TimeoutException:
            state.communication.status = ConnectionStatus.TIMEOUT
            state.communication.last_error = "Connection timed out"
            state.communication.last_response = None
            return None
        except httpx.RequestError as e:
            state.communication.status = ConnectionStatus.UNREACHABLE
            state.communication.last_error = str(e)
            state.communication.last_response = None
            return None
        except httpx.HTTPStatusError as e:
            state.communication.status = ConnectionStatus.ERROR
            state.communication.last_error = f"HTTP Error {e.response.status_code}"
            state.communication.last_response = None
            return None

esp32_client = ESP32Client()
