# ESP32 Integration Contract

This document defines the interface for the ESP32 to receive data from Laptop 1 (AGRI-SENSE Field Simulator).

## Communication Architecture
- **Transport**: Wired USB Serial (UART)
- **Baud Rate**: 115200 (default, configurable in Laptop 1 UI)
- **Data Format**: Newline-delimited JSON
- **Direction**: Laptop 1 -> ESP32 (One-way telemetry)

## Packet Format
Every packet sent over serial is a single, minified JSON object followed immediately by a newline character (`\n`). 

### Schema
```json
{
  "timestamp": 125,
  "rainfall_mm": 0,
  "zones": [
    {
      "zone_id": "Z01",
      "temperature_c": 31.5,
      "flow_lpm": 0,
      "sensors": [
        {
          "sensor_id": "S01",
          "moisture_percent": 42
        },
        {
          "sensor_id": "S02",
          "moisture_percent": 44
        },
        {
          "sensor_id": "S03",
          "moisture_percent": 90
        }
      ]
    },
    ...
  ]
}
```

### Constraints & Rules for ESP32 Developers
1. **No Fault Labels Included**: The JSON packet contains ONLY observed moisture values. Even if the simulator injects a massive outlier (e.g., S03 jumps to 90%), the packet will simply contain `"moisture_percent": 90`. It will NOT include any `fault`, `status`, or `anomaly` fields.
2. **Missing Sensors**: If a sensor is "missing", it will simply be omitted from the `sensors` array for that zone.
3. **One Packet Per Line**: You should read incoming serial bytes until you hit a `\n` character, then parse the resulting string as a complete JSON document.
4. **No Response Expected**: Laptop 1 sends the data and logs transmission success. You do NOT need to write a response back to the USB Serial port for Laptop 1 to read.
5. **Debug Output**: You can and should print debug statements using `Serial.println()` back to the USB connection if you want to use the Arduino IDE Serial Monitor for debugging. Laptop 1 will simply ignore incoming data unless a specific two-way protocol is added later.

## Example Arduino Reading Logic
```cpp
void setup() {
  Serial.begin(115200);
}

void loop() {
  if (Serial.available()) {
    String jsonString = Serial.readStringUntil('\n');
    // Pass jsonString to ArduinoJson or similar library
    parseAndProcess(jsonString);
  }
}
```
