'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ApplicationState, ScenarioType } from '@/types/simulation';

import Header from '@/components/Header';
import EnvironmentPanel from '@/components/EnvironmentPanel';
import FaultInjectionPanel from '@/components/FaultInjectionPanel';
import SimulationControls from '@/components/SimulationControls';
import ZoneMap from '@/components/ZoneMap';
import PacketViewer from '@/components/PacketViewer';
import CommunicationPanel from '@/components/CommunicationPanel';

interface LogEvent { time: string; message: string; success: boolean; }

const ts = () => new Date().toLocaleTimeString('en-GB');

export default function Dashboard() {
  const [state, setState] = useState<ApplicationState | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeZone, setActiveZone] = useState('Z01');
  const [packet, setPacket] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addEvent = (msg: string, ok = true) =>
    setEvents(prev => [...prev.slice(-49), { time: ts(), message: msg, success: ok }]);

  const fetchState = useCallback(async () => {
    try {
      const s = await api.getState();
      setState(s);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  const fetchPacket = useCallback(async () => {
    try {
      const p = await api.getPacket();
      setPacket(p);
    } catch { /* ignore */ }
  }, []);

  // Poll every second
  useEffect(() => {
    fetchState();
    fetchPacket();
    pollRef.current = setInterval(() => { fetchState(); }, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchState, fetchPacket]);

  // ─── Simulation controls ─────────────────────────────────────────
  const step = async () => {
    try {
      const r = await api.stepSimulation();
      setPacket(r.packet);
      await fetchState();
      addEvent(`Simulation stepped → update #${r.update_counter}`);
    } catch (e) { addEvent('Step failed', false); }
  };

  const start = async () => {
    try {
      await api.startSimulation();
      await fetchState();
      addEvent('Live simulation started');
    } catch { addEvent('Failed to start simulation', false); }
  };

  const stop = async () => {
    try {
      await api.stopSimulation();
      await fetchState();
      addEvent('Simulation paused');
    } catch { addEvent('Failed to pause', false); }
  };

  const reset = async () => {
    try {
      await api.resetSimulation();
      setPacket(null);
      await fetchState();
      addEvent('Simulation reset');
    } catch { addEvent('Reset failed', false); }
  };

  const setSpeed = async (ms: number) => {
    if (!state) return;
    try {
      await api.setSimConfig(state.mode, ms);
      await fetchState();
    } catch { /* ignore */ }
  };

  // ─── Environment ─────────────────────────────────────────────────
  const updateRainfall = async (v: number) => {
    try { await api.updateEnvironment({ rainfall_mm: v }); } catch { /* ignore */ }
  };

  const updateTemperature = async (v: number) => {
    try { await api.updateEnvironment({ zone_temperatures: { [activeZone]: v } }); } catch { /* ignore */ }
  };

  const updateFlow = async (v: number) => {
    try { await api.updateEnvironment({ zone_flows: { [activeZone]: v } }); } catch { /* ignore */ }
  };

  const updateAdcValue = async (sensorId: string, adc: number) => {
    try { await api.updateEnvironment({ sensor_adc: { [sensorId]: adc } }); } catch { /* ignore */ }
  };

  // ─── Scenarios ───────────────────────────────────────────────────
  const applyScenario = async (type: ScenarioType, sensor: string, params: Record<string, unknown>) => {
    try {
      await api.applyScenario({ target_zone: activeZone, target_sensor: sensor, scenario_type: type, parameters: params });
      await fetchState();
      addEvent(`Scenario ${type} applied → ${sensor}`);
    } catch { addEvent('Failed to apply scenario', false); }
  };

  const resetScenario = async (sensor: string) => {
    try {
      await api.resetScenario(sensor);
      await fetchState();
      addEvent(`Scenario reset for ${sensor}`);
    } catch { addEvent('Failed to reset scenario', false); }
  };

  // ─── ESP32 ───────────────────────────────────────────────────────
  const sendToEsp32 = async () => {
    setSending(true);
    addEvent('Packet generated');
    addEvent('Sending via USB Serial');
    try {
      const r = await api.sendPacketToEsp32();
      setPacket(r.packet);
      await fetchState();
      if (r.success) {
        addEvent('Packet transmitted');
        addEvent('Packet sent successfully ✓');
      } else {
        addEvent('Transmission failed', false);
      }
    } catch { 
      addEvent('Serial disconnected or error', false); 
    }
    finally { setSending(false); }
  };

  const zone = state?.simulation.zones[activeZone] ?? null;
  const rainfall = state?.simulation.rainfall_mm ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Header */}
      <Header
        backendOnline={backendOnline}
        esp32Status={state?.communication.status ?? 'CONFIGURED'}
        simulationMode={state?.mode ?? 'PAUSED'}
        updateCounter={state?.simulation.update_counter ?? 0}
        activeZone={activeZone}
        onZoneChange={setActiveZone}
        onSendToEsp32={sendToEsp32}
        sending={sending}
      />

      {/* Offline banner */}
      {!backendOnline && (
        <div className="bg-red-950/60 border-b border-red-800/40 py-2 text-center text-sm text-red-300">
          ⚠️ Cannot reach Python backend at <span className="font-mono">http://localhost:8000</span> — start the FastAPI server.
        </div>
      )}

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 flex flex-col gap-5">
        {/* Simulation controls bar */}
        <SimulationControls
          mode={state?.mode ?? 'PAUSED'}
          intervalMs={state?.interval_ms ?? 1000}
          onStep={step}
          onStart={start}
          onStop={stop}
          onReset={reset}
          onSpeedChange={setSpeed}
        />

        {/* Main two-column layout — mirrors reference image */}
        <div className="flex gap-5" style={{ minHeight: '520px' }}>
          {/* Left: Environment + Zone Map */}
          <div className="flex-1 flex flex-col gap-5" style={{ minWidth: 0 }}>
            <EnvironmentPanel
              zone={zone}
              rainfall={rainfall}
              mode={state?.mode ?? 'PAUSED'}
              onRainfallChange={updateRainfall}
              onTemperatureChange={updateTemperature}
              onFlowChange={updateFlow}
              onAdcChange={updateAdcValue}
              isLive={state?.mode === 'LIVE'}
            />
            
            <ZoneMap
              zones={state?.simulation.zones ?? {}}
              activeScenarios={state?.scenario.active_scenarios ?? {}}
              selectedZone={activeZone}
              onSelectZone={setActiveZone}
            />
          </div>

          {/* Right: Fault Injection */}
          <div className="w-80 flex-shrink-0">
            <FaultInjectionPanel
              activeZone={activeZone}
              activeScenarios={state?.scenario.active_scenarios ?? {}}
              onApply={applyScenario}
              onReset={resetScenario}
            />
          </div>
        </div>

        {/* Bottom: Packet + Communication */}
        <div className="grid grid-cols-12 gap-5">

          {/* Packet Viewer */}
          <div className="col-span-7" style={{ minHeight: '320px' }}>
            <PacketViewer
              packet={packet}
              onRefresh={fetchPacket}
              onSend={sendToEsp32}
              sending={sending}
            />
          </div>

          {/* Communication Panel */}
          <div className="col-span-5" style={{ minHeight: '320px' }}>
            {state && (
              <CommunicationPanel
                communication={state.communication}
                events={events}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
