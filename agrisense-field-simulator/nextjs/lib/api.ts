import axios from 'axios';
import type { ApplicationState, Esp32Config, SimulationMode } from '@/types/simulation';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const client = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });

export const api = {
  getState:        () => client.get<ApplicationState>('/simulation/state').then(r => r.data),
  stepSimulation:  () => client.post('/simulation/step').then(r => r.data),
  resetSimulation: () => client.post('/simulation/reset').then(r => r.data),
  startSimulation: () => client.post('/simulation/config', { mode: 'LIVE', interval_ms: 1000 }).then(r => r.data),
  stopSimulation:  () => client.post('/simulation/config', { mode: 'PAUSED', interval_ms: 1000 }).then(r => r.data),
  setSimConfig:    (mode: SimulationMode, interval_ms: number) => client.post('/simulation/config', { mode, interval_ms }).then(r => r.data),

  updateEnvironment: (data: { rainfall_mm?: number; zone_temperatures?: Record<string,number>; zone_flows?: Record<string,number> }) =>
    client.post('/simulation/environment', data).then(r => r.data),

  applyScenario: (data: {
    target_zone: string;
    target_sensor: string;
    scenario_type: string;
    parameters?: Record<string, unknown>;
    duration_updates?: number | null;
  }) => client.post('/scenario/apply', data).then(r => r.data),

  resetScenario: (sensor_id: string) =>
    client.post(`/scenario/reset?target_sensor=${sensor_id}`).then(r => r.data),

  getPacket:        () => client.get('/esp32/packet').then(r => r.data),
  sendPacketToEsp32:() => client.post('/esp32/send').then(r => r.data),
  getEsp32Status:   () => client.get('/esp32/status').then(r => r.data),
  configureEsp32:   (config: Esp32Config) => client.post('/esp32/config', config).then(r => r.data),

  getSystemStatus:  () => client.get('/system/status').then(r => r.data),
};
