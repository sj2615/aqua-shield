'use client';

import { useState } from 'react';
import type { ZoneState } from '@/types/simulation';

interface Props {
  zone: ZoneState | null;
  rainfall: number;
  onRainfallChange: (v: number) => void;
  onTemperatureChange: (v: number) => void;
  onFlowChange: (v: number) => void;
}

interface CardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  min: number; max: number; step: number;
  accent: string;
  bg: string;
  readOnly?: boolean;
  barValue?: number;
  onChange?: (v: number) => void;
}

function SensorCard({ icon, label, value, unit, min, max, step, accent, bg, readOnly, barValue, onChange }: CardProps) {
  const [local, setLocal] = useState(value);
  const displayVal = readOnly ? value : local;
  const pct = ((displayVal - min) / (max - min)) * 100;

  const handle = (v: number) => { setLocal(v); onChange?.(v); };

  return (
    <div style={{ background: bg, borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <span style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
        </div>
        <div>
          <span style={{ fontSize: 28, fontWeight: 800, color: accent }}>{displayVal.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 3 }}>{unit}</span>
        </div>
      </div>

      {readOnly ? (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div style={{ position: 'relative', height: 4, background: '#1e293b', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${Math.min(barValue ?? pct, 100)}%`, background: accent, borderRadius: 2, transition: 'width 0.4s ease' }} />
            {/* Visual Thumb for ReadOnly */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${Math.min(barValue ?? pct, 100)}%`,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 8px ${accent}80`,
              transition: 'left 0.4s ease',
              pointerEvents: 'none'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 10, color: '#475569' }}>
            <span>{min}{unit}</span><span>{max}{unit}</span>
          </div>
        </div>
      ) : (
        <div style={{ '--thumb-color': accent, '--thumb-shadow': `${accent}80` } as React.CSSProperties}>
          <input type="range" min={min} max={max} step={step} value={local} onChange={e => handle(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#475569' }}>
            <span>{min}{unit}</span><span>{max}{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnvironmentPanel({ zone, rainfall, onRainfallChange, onTemperatureChange, onFlowChange }: Props) {
  const sensors = zone ? Object.values(zone.sensors) : [];
  const avgMoisture = sensors.length > 0 ? sensors.reduce((s, x) => s + x.observed_moisture, 0) / sensors.length : 0;

  return (
    <div style={{ background: 'rgba(10,15,26,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: '#10b981', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            🌱 Environment Parameters
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>Live field conditions — all changes go to Python backbone</div>
        </div>
      </div>

      {/* 2×2 card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>

        <SensorCard
          icon="💧" label="Soil Moisture" value={avgMoisture} unit="%"
          min={0} max={100} step={1}
          accent="#10b981" bg="linear-gradient(135deg, #052e16 0%, #0d1f14 100%)"
          readOnly barValue={avgMoisture}
        />

        <SensorCard
          icon="🌡️" label="Temperature" value={zone?.temperature_c ?? 25} unit="°C"
          min={0} max={50} step={0.5}
          accent="#f59e0b" bg="linear-gradient(135deg, #1c0a00 0%, #120800 100%)"
          onChange={onTemperatureChange}
        />

        <SensorCard
          icon="💨" label="Irrigation Flow" value={zone?.flow_lpm ?? 0} unit=" L/m"
          min={0} max={20} step={0.5}
          accent="#38bdf8" bg="linear-gradient(135deg, #0c1a2e 0%, #071525 100%)"
          onChange={onFlowChange}
        />

        <SensorCard
          icon="🌧️" label="Rainfall" value={rainfall} unit=" mm"
          min={0} max={50} step={0.5}
          accent="#818cf8" bg="linear-gradient(135deg, #1a0c2e 0%, #100820 100%)"
          onChange={onRainfallChange}
        />

      </div>

      {/* Rainfall presets row */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#94a3b8', fontSize: 13 }}>
          ⚙ Rainfall Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'NO RAIN', val: 0, color: '#374151', border: '#4b5563' },
            { label: 'LIGHT RAIN', val: 10, color: '#0e3a5c', border: '#38bdf8' },
            { label: 'HEAVY RAIN', val: 35, color: '#1e1b4b', border: '#818cf8' },
          ].map(p => (
            <button key={p.label} onClick={() => onRainfallChange(p.val)}
              style={{ background: p.color, border: `1px solid ${p.border}`, borderRadius: 10, padding: '10px', color: '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'opacity 0.15s' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
