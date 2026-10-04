export type ScenarioType = 'NORMAL' | 'OUTLIER' | 'SUDDEN_JUMP' | 'STUCK' | 'DRIFT' | 'MISSING' | 'NOISE' | 'BIAS';
export type SimulationMode = 'PAUSED' | 'MANUAL' | 'LIVE';
export type ConnectionStatus = 'CONFIGURED' | 'CHECKING' | 'CONNECTED' | 'UNREACHABLE' | 'TIMEOUT' | 'ERROR';

export interface SensorState {
  sensor_id: string;
  adc_value: number;           // Raw ESP32 analogRead() 0-4095
  ground_truth_moisture: number;
  observed_moisture: number;
}

export interface ZoneState {
  zone_id: string;
  temperature_c: number;
  observed_temperature_c: number;
  temperature_target_c: number;
  flow_lpm: number;
  flow_target_lpm: number;
  sensors: Record<string, SensorState>;
}

export interface SimulationState {
  update_counter: number;
  simulation_time: number;
  rainfall_mm: number;
  zones: Record<string, ZoneState>;
}

export interface ActiveScenario {
  scenario_type: ScenarioType;
  target_zone: string;
  target_sensor: string;
  parameters: Record<string, unknown>;
  start_time: number;
  duration_updates: number | null;
}

export interface Esp32Config {
  host: string;
  port: number;
  endpoint: string;
}

export interface CommunicationState {
  config: Esp32Config;
  status: ConnectionStatus;
  last_checked: string | null;
  last_error: string | null;
  last_request: unknown | null;
  last_response: unknown | null;
}

export interface ApplicationState {
  simulation: SimulationState;
  scenario: { active_scenarios: Record<string, ActiveScenario> };
  communication: CommunicationState;
  mode: SimulationMode;
  interval_ms: number;
}
