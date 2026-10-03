'use client';

import { useState } from 'react';
import type { ScenarioType } from '@/types/simulation';

interface Scenario {
  type: ScenarioType; label: string; desc: string; icon: string;
  paramKey?: string; paramLabel?: string; paramDefault?: number; paramMin?: number; paramMax?: number; paramStep?: number;
}

const SCENARIOS: Scenario[] = [
  { type: 'OUTLIER',     icon: '📈', label: 'Sensor Outlier (Spike)',  desc: 'Injects random massive spikes in readings',          paramKey: 'value',      paramLabel: 'Injected value',      paramDefault: 90,  paramMin: 51, paramMax: 100, paramStep: 1  },
  { type: 'STUCK',       icon: '🔒', label: 'Stuck Sensor',            desc: 'Freezes current values indefinitely',                },
  { type: 'DRIFT',       icon: '📉', label: 'Sensor Drift',            desc: 'Gradual degradation of accuracy over time',          paramKey: 'rate',       paramLabel: 'Drift rate (%/step)', paramDefault: 1.5, paramMin: 0.1, paramMax: 5,   paramStep: 0.1},
  { type: 'MISSING',     icon: '📡', label: 'Missing Sensor Data',     desc: 'Omits sensor from the outgoing packet entirely',     },
  { type: 'NOISE',       icon: '🔊', label: 'Sensor Noise',            desc: 'Adds controlled random variation to readings',       paramKey: 'amplitude',  paramLabel: 'Amplitude (±%)',      paramDefault: 5,   paramMin: 1,   paramMax: 15,  paramStep: 0.5},
  { type: 'BIAS',        icon: '⚖️', label: 'Sensor Bias',             desc: 'Applies a consistent systematic offset',            paramKey: 'bias',       paramLabel: 'Bias offset (%)',     paramDefault: 10,  paramMin: 1,   paramMax: 25,  paramStep: 1  },
  { type: 'SUDDEN_JUMP', icon: '⚡', label: 'Sudden Jump',             desc: 'Creates an abrupt step-change in observed value',   paramKey: 'jump_value', paramLabel: 'Jump amount (%)',     paramDefault: 35,  paramMin: 5,   paramMax: 60,  paramStep: 1  },
];

const ZONE_SENSORS: Record<string, string[]> = {
  Z01: ['S01','S02','S03'], Z02: ['S04','S05','S06'],
  Z03: ['S07','S08','S09'], Z04: ['S10','S11','S12'],
};

interface Props {
  activeZone: string;
  activeScenarios: Record<string, { scenario_type: ScenarioType; target_sensor: string }>;
  onApply: (type: ScenarioType, sensor: string, params: Record<string,unknown>) => void;
  onReset: (sensor: string) => void;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#059669' : '#1e293b', border: on ? '1px solid #10b981' : '1px solid #334155', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all 0.2s', boxShadow: on ? '0 0 10px rgba(16,185,129,0.4)' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  );
}

export default function FaultInjectionPanel({ activeZone, activeScenarios, onApply, onReset }: Props) {
  const sensors = ZONE_SENSORS[activeZone] ?? [];
  const [selectedSensor, setSelectedSensor] = useState(sensors[0]);
  const [params, setParams] = useState<Record<string, number>>({ OUTLIER: 90, STUCK: 0, DRIFT: 1.5, MISSING: 0, NOISE: 5, BIAS: 10, SUDDEN_JUMP: 35, NORMAL: 0 });

  const currSensor = selectedSensor || sensors[0];
  const isActive = (type: ScenarioType) => Object.values(activeScenarios).some(s => s.scenario_type === type && s.target_sensor === currSensor);

  const toggle = (s: Scenario) => {
    if (isActive(s.type)) { onReset(currSensor); return; }
    const p: Record<string,unknown> = {};
    if (s.paramKey) p[s.paramKey] = params[s.type] ?? s.paramDefault;
    onApply(s.type, currSensor, p);
  };

  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: '#f43f5e', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>⚠ Fault Injection</div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>Simulate hardware &amp; network anomalies</div>
        </div>
      </div>

      {/* Sensor selector */}
      <div>
        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>TARGET SENSOR</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sensors.map(s => (
            <button key={s} onClick={() => setSelectedSensor(s)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: s === currSensor ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.1)', background: s === currSensor ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)', color: s === currSensor ? '#fda4af' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SCENARIOS.map(sc => {
          const active = isActive(sc.type);
          return (
            <div key={sc.type} style={{ background: active ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.02)', border: active ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginTop: 2 }}>{sc.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fda4af' : '#e2e8f0' }}>{sc.label}</span>
                    <Toggle on={active} onClick={() => toggle(sc)} />
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>{sc.desc}</div>

                  {/* Parameter slider — show when NOT active so user can configure before enabling */}
                  {sc.paramKey && !active && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#4b5563', flexShrink: 0, width: 110 }}>{sc.paramLabel}</span>
                      <input type="range" min={sc.paramMin} max={sc.paramMax} step={sc.paramStep} value={params[sc.type] ?? sc.paramDefault}
                        onChange={e => setParams(p => ({ ...p, [sc.type]: Number(e.target.value) }))} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', fontFamily: 'monospace', width: 28, textAlign: 'right' }}>
                        {params[sc.type] ?? sc.paramDefault}
                      </span>
                    </div>
                  )}

                  {active && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e' }} className="glow-dot" />
                      <span style={{ fontSize: 11, color: '#f43f5e', fontWeight: 700 }}>ACTIVE → {currSensor}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset all */}
      <button onClick={() => sensors.forEach(s => onReset(s))} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
        onMouseOver={e => (e.currentTarget.style.color = '#e2e8f0')} onMouseOut={e => (e.currentTarget.style.color = '#6b7280')}>
        ↺ Reset All Scenarios
      </button>
    </div>
  );
}
